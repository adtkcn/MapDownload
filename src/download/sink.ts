import { createWriteStream } from 'node:fs'
import { mkdir, readdir, rename, unlink } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage } from 'node:http'

type ColumnEntry = {
  /** 该列已存在的文件名集合 */
  files: Set<string> | null
  /** 正在读取中，同列的其他分片复用这一次 readdir */
  loading: Promise<Set<string>> | null
  /** 正在使用该列的分片数量 */
  refs: number
}

/**
 * 文件落盘
 *
 * 全部走异步 API，避免在事件循环里执行同步 stat / mkdir 把网络回调拖住。
 * 目录创建与"文件是否已存在"都按列维度缓存，一列瓦片只做一次 readdir。
 */
export class FileSink {
  private readonly dirCache = new Set<string>()
  private readonly columns = new Map<string, ColumnEntry>()
  private activeWrites = 0
  private readonly waiters: Array<() => void> = []

  constructor(private readonly writeConcurrency: number) {}

  async ensureDir(dir: string): Promise<void> {
    if (this.dirCache.has(dir)) return
    await mkdir(dir, { recursive: true })
    this.dirCache.add(dir)
  }

  /**
   * 取得某个瓦片列已存在的文件集合。
   *
   * 同一列的多个分片共享这一次 readdir：第一个到达的分片触发读取，
   * 其余分片复用同一个 Promise；引用计数归零后释放，避免长任务内存堆积。
   */
  async acquireColumn(dir: string): Promise<Set<string>> {
    let entry = this.columns.get(dir)
    if (!entry) {
      entry = { files: null, loading: null, refs: 0 }
      this.columns.set(dir, entry)
    }
    entry.refs++

    if (entry.files) return entry.files
    if (!entry.loading) {
      const current = entry
      entry.loading = readDirNames(dir).then((files) => {
        current.files = files
        current.loading = null
        return files
      })
    }
    return entry.loading
  }

  /** 分片处理完毕后归还列缓存 */
  releaseColumn(dir: string): void {
    const entry = this.columns.get(dir)
    if (!entry) return
    entry.refs--
    if (entry.refs <= 0) this.columns.delete(dir)
  }

  /**
   * 把响应流直接写入目标文件，先写临时文件再 rename，避免出现半截文件。
   * 返回写入的字节数。
   */
  async write(res: IncomingMessage, dest: string): Promise<number> {
    const tmp = `${dest}.part`
    await this.acquire()
    try {
      let bytes = 0
      const counter = new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length
          callback(null, chunk)
        }
      })
      await pipeline(res, counter, createWriteStream(tmp))
      await rename(tmp, dest)

      const entry = this.columns.get(dirname(dest))
      if (entry?.files) entry.files.add(basename(dest))

      return bytes
    } catch (error) {
      await unlink(tmp).catch(() => undefined)
      throw error
    } finally {
      this.release()
    }
  }

  private async acquire(): Promise<void> {
    if (this.activeWrites < this.writeConcurrency) {
      this.activeWrites++
      return
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve))
    this.activeWrites++
  }

  private release(): void {
    this.activeWrites--
    const waiter = this.waiters.shift()
    if (waiter) waiter()
  }
}

async function readDirNames(dir: string): Promise<Set<string>> {
  try {
    return new Set(await readdir(dir))
  } catch {
    return new Set()
  }
}
