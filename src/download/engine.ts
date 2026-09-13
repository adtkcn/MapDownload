import { join } from 'node:path'
import { buildTileUrl } from '../shared/tileUrl'
import { isBaiduProjection, tileBounds } from '../shared/tileRange'
import type {
  DownloadJob,
  DownloadProgress,
  ProgressState,
  TileSource,
  TileUrlRule
} from '../shared/downloadTypes'
import {
  createAgents,
  destroyAgents,
  randomForwardedFor,
  randomUserAgent,
  type AgentPair
} from './httpPool'
import { requestTile } from './fetchStream'
import { FileSink } from './sink'

/** 列数不足以喂满并发时的分片粒度 */
const FALLBACK_ROWS_PER_SHARD = 256
/**
 * 列数充足时的分片粒度。
 * 短列（绝大多数）本来就是整列一个分片；超长列必须拆分，
 * 否则单个 worker 要串行跑完上千片，末尾只剩几个长列时并发会塌掉。
 */
const MAX_ROWS_PER_SHARD = 512
/** 分片总数达到并发数的这个倍数时，认为负载均衡已经足够 */
const SHARDS_PER_WORKER = 4
/** 每个域名的最小连接数 */
const MIN_SOCKETS_PER_HOST = 8
/** 进度回推间隔（毫秒），避免每个瓦片都推送一次 */
const PROGRESS_INTERVAL = 250

type Shard = {
  source: TileSource
  layerDir: string
  z: number
  x: number
  y0: number
  y1: number
}

export type EngineLogger = (level: 'info' | 'warn' | 'error', message: string) => void

/**
 * 瓦片下载引擎
 *
 * 调度策略：按 (z, x) 列分片，worker 领取分片后纵向遍历 y。
 * 这样做的好处是同列瓦片共享一次 mkdir 与一次 readdir，
 * 并且不需要在内存里保存百万级的任务数组。
 */
export class DownloadEngine {
  private agents: AgentPair | null = null
  private sink: FileSink | null = null
  private controller: AbortController | null = null
  private timer: NodeJS.Timeout | null = null

  private running = false
  private paused = false
  private stopped = false
  private gate: Promise<void> | null = null
  private releaseGate: (() => void) | null = null
  private currentJob: DownloadJob | null = null
  private currentLayer = ''

  private readonly stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    retried: 0,
    inFlight: 0,
    bytes: 0
  }

  constructor(
    private readonly emit: (progress: DownloadProgress) => void,
    private readonly log?: EngineLogger
  ) {}

  async start(job: DownloadJob): Promise<void> {
    if (this.running) {
      this.log?.('warn', '已有下载任务在执行，忽略本次请求')
      return
    }
    this.running = true
    this.paused = false
    this.stopped = false
    this.currentJob = job
    this.resetStats()
    this.stats.total = countTiles(job)

    this.agents = createAgents({ socketsPerHost: resolveSocketsPerHost(job) })
    this.sink = new FileSink(job.writeConcurrency)
    this.controller = new AbortController()

    const iter = this.shards(job)
    const workerCount = Math.max(1, job.concurrency)
    const workers: Promise<void>[] = []
    for (let i = 0; i < workerCount; i++) {
      workers.push(this.workerLoop(job, iter))
    }

    this.timer = setInterval(() => {
      this.emitProgress(this.paused ? 'paused' : 'running')
    }, PROGRESS_INTERVAL)

    try {
      await Promise.all(workers)
    } catch (error) {
      this.log?.('error', `下载异常：${String(error)}`)
    } finally {
      this.cleanup()
      this.emitProgress(this.stopped ? 'stopped' : 'done')
      this.running = false
    }
  }

  pause(): void {
    if (!this.running || this.paused) return
    this.paused = true
    this.emitProgress('paused')
  }

  resume(): void {
    if (!this.running || !this.paused) return
    this.paused = false
    this.releaseGate?.()
    this.releaseGate = null
    this.gate = null
  }

  stop(): void {
    if (!this.running) return
    this.stopped = true
    this.controller?.abort()
    this.releaseGate?.()
    this.releaseGate = null
    this.gate = null
  }

  // ---------------- 调度 ----------------

  /**
   * 决定分片粒度：列数充足时短列就是完整一列（共享缓存保证每列只 readdir 一次），
   * 但列长超过 MAX_ROWS_PER_SHARD 仍要拆分，避免长尾拖慢整体。
   */
  private planRowsPerShard(job: DownloadJob): number {
    const columns = countColumns(job)
    const workers = Math.max(1, job.concurrency)
    return columns >= workers * SHARDS_PER_WORKER ? MAX_ROWS_PER_SHARD : FALLBACK_ROWS_PER_SHARD
  }

  private *shards(job: DownloadJob): Generator<Shard> {
    const rowsPerShard = this.planRowsPerShard(job)
    for (const source of job.sources) {
      const layerDir = join(job.rootPath, safeDirName(source.layerId))
      const isBaidu = isBaiduProjection(source.projection)
      for (let z = job.zMin; z <= job.zMax; z++) {
        const bounds = tileBounds(job.extent, z, isBaidu)
        for (let x = bounds.x0; x <= bounds.x1; x++) {
          for (let y = bounds.y0; y <= bounds.y1; y += rowsPerShard) {
            yield {
              source,
              layerDir,
              z,
              x,
              y0: y,
              y1: Math.min(y + rowsPerShard - 1, bounds.y1)
            }
          }
        }
      }
    }
  }

  private async workerLoop(job: DownloadJob, iter: Iterator<Shard>): Promise<void> {
    while (!this.stopped) {
      if (this.paused) {
        await this.waitResume()
        if (this.stopped) break
      }
      const next = iter.next()
      if (next.done || !next.value) break
      await this.processShard(job, next.value)
    }
  }

  private async processShard(job: DownloadJob, shard: Shard): Promise<void> {
    const sink = this.sink
    if (!sink) return

    this.currentLayer = shard.source.layerId
    const dir = join(shard.layerDir, String(shard.z), String(shard.x))
    await sink.ensureDir(dir)
    const existing = job.skipExist ? await sink.acquireColumn(dir) : null
    const suffix = `.${job.imageType}`

    try {
      for (let y = shard.y0; y <= shard.y1; y++) {
        if (this.stopped) break
        if (this.paused) {
          await this.waitResume()
          if (this.stopped) break
        }

        const name = `${y}${suffix}`
        if (existing && existing.has(name)) {
          this.stats.skipped++
          continue
        }
        await this.downloadOne(job, shard, y, join(dir, name))
      }
    } finally {
      if (existing) sink.releaseColumn(dir)
    }
  }

  private async downloadOne(
    job: DownloadJob,
    shard: Shard,
    y: number,
    dest: string
  ): Promise<void> {
    const sink = this.sink
    const agents = this.agents
    if (!sink || !agents) return

    const rule = shard.source.urlRule
    for (let attempt = 0; attempt <= job.maxRetry; attempt++) {
      if (this.stopped) return

      // 重试时通过 hostOffset 切换到下一个域名
      const url = buildTileUrl(rule, shard.z, shard.x, y, attempt)
      this.stats.inFlight++
      try {
        const result = await requestTile(
          {
            url,
            agents,
            signal: this.controller?.signal,
            timeoutMs: job.timeoutMs,
            headers: this.buildHeaders(job)
          },
          (res) => sink.write(res, dest)
        )
        this.stats.success++
        this.stats.bytes += result.bytes
        return
      } catch (error) {
        if (this.stopped) return
        if (attempt < job.maxRetry) {
          this.stats.retried++
          await sleep(backoffDelay(attempt))
        } else {
          this.stats.failed++
          this.log?.('warn', `下载失败 ${url}：${messageOf(error)}`)
        }
      } finally {
        this.stats.inFlight--
      }
    }
  }

  // ---------------- 辅助 ----------------

  private buildHeaders(job: DownloadJob): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': randomUserAgent(),
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Encoding': 'identity',
      'X-Forwarded-For': randomForwardedFor()
    }
    if (job.referer) headers['Referer'] = job.referer
    return headers
  }

  private waitResume(): Promise<void> {
    if (!this.paused) return Promise.resolve()
    if (!this.gate) {
      this.gate = new Promise<void>((resolve) => {
        this.releaseGate = resolve
      })
    }
    return this.gate
  }

  private resetStats(): void {
    this.stats.total = 0
    this.stats.success = 0
    this.stats.failed = 0
    this.stats.skipped = 0
    this.stats.retried = 0
    this.stats.inFlight = 0
    this.stats.bytes = 0
  }

  private emitProgress(state: ProgressState): void {
    const job = this.currentJob
    if (!job) return
    this.emit({
      jobId: job.jobId,
      state,
      layerId: this.currentLayer,
      total: this.stats.total,
      success: this.stats.success,
      failed: this.stats.failed,
      skipped: this.stats.skipped,
      retried: this.stats.retried,
      inFlight: this.stats.inFlight,
      bytes: this.stats.bytes
    })
  }

  private cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.agents) {
      destroyAgents(this.agents)
      this.agents = null
    }
    this.sink = null
    this.controller = null
  }
}

/** 预估总瓦片数，用于进度显示 */
function countTiles(job: DownloadJob): number {
  let total = 0
  for (const source of job.sources) {
    const isBaidu = isBaiduProjection(source.projection)
    for (let z = job.zMin; z <= job.zMax; z++) {
      const bounds = tileBounds(job.extent, z, isBaidu)
      total += (bounds.x1 - bounds.x0 + 1) * (bounds.y1 - bounds.y0 + 1)
    }
  }
  return total
}

/** 图层可用的域名数量：主机池优先，其次是 {s} 子域名 */
function hostCountOf(rule: TileUrlRule): number {
  const hosts = rule.hosts?.length ?? 0
  const subs = rule.subdomains?.length ?? 0
  return Math.max(1, hosts || subs)
}

/**
 * 按域名数分摊并发连接数。
 *
 * Node 的 maxSockets 是 per host，单域名源若固定为 16，
 * 实际并发就被锁死在 16，多出来的 worker 全部空转。
 */
function resolveSocketsPerHost(job: DownloadJob): number {
  const hostCount = Math.max(1, ...job.sources.map((source) => hostCountOf(source.urlRule)))
  const perHost = Math.ceil(job.concurrency / hostCount)
  return Math.max(MIN_SOCKETS_PER_HOST, Math.min(job.socketsPerHost, perHost))
}

/** 预估总列数，用于决定分片粒度 */
function countColumns(job: DownloadJob): number {
  let columns = 0
  for (const source of job.sources) {
    const isBaidu = isBaiduProjection(source.projection)
    for (let z = job.zMin; z <= job.zMax; z++) {
      const bounds = tileBounds(job.extent, z, isBaidu)
      columns += Math.max(0, bounds.x1 - bounds.x0 + 1)
    }
  }
  return columns
}

function backoffDelay(attempt: number): number {
  const base = Math.min(400 * Math.pow(2, attempt), 6000)
  return base + Math.floor(Math.random() * 200)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function safeDirName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_') || 'tiles'
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
