import type * as MaptalksType from 'maptalks/src/index.ts'
import type { saveParam } from '../components/types'
import type { DownloadJob, TileSource, TileUrlRule } from '@shared/downloadTypes'

/** 总并发请求数 */
const DEFAULT_CONCURRENCY = 32
/** 同时写盘的文件数 */
const DEFAULT_WRITE_CONCURRENCY = 16
/** 每个域名的最大并发连接数 */
const DEFAULT_SOCKETS_PER_HOST = 16
const DEFAULT_TIMEOUT = 20_000
const DEFAULT_MAX_RETRY = 3

type LayerOptions = {
  urlTemplate?: string
  subdomains?: Array<string | number>
  hosts?: string[]
  customTags?: Record<string, string | number>
  /** 'tencent' 表示需要 TMS 翻转并处理 {m} {n} */
  urlRule?: string
}

/**
 * 下载 TMS 瓦片集合
 *
 * 这里只负责把「范围 + URL 模板」一次性下发给主进程，
 * 具体的瓦片范围计算与 URL 生成都在下载子进程里完成，
 * 避免为每个瓦片做一次跨进程通信。
 */
export class TileTMSList {
  constructor(data: saveParam) {
    this.download(data)
  }

  private download(data: saveParam): void {
    const projection = data.mapConfig.projection?.code ?? 'EPSG:3857'
    const sources = (data.mapConfig.tileLayer ?? [])
      .map((layer) => toTileSource(layer, projection))
      .filter((source) => source.urlRule.template.length > 0)

    if (sources.length === 0) {
      console.warn('没有可下载的图层，请检查图层配置')
      return
    }

    const job: DownloadJob = {
      jobId: `job-${Date.now()}`,
      rootPath: data.savePath,
      sources,
      extent: [data.extent.xmin, data.extent.ymin, data.extent.xmax, data.extent.ymax],
      zMin: data.minZoom,
      zMax: data.maxZoom,
      imageType: data.imageType,
      concurrency: DEFAULT_CONCURRENCY,
      writeConcurrency: DEFAULT_WRITE_CONCURRENCY,
      maxRetry: DEFAULT_MAX_RETRY,
      skipExist: true,
      socketsPerHost: DEFAULT_SOCKETS_PER_HOST,
      timeoutMs: DEFAULT_TIMEOUT
    }

    void window.api.downloadStart(job)
  }
}

function toTileSource(layer: MaptalksType.Layer, projection: string): TileSource {
  const raw = layer as unknown as { _id?: string; options?: LayerOptions }
  const options = raw.options ?? {}

  const rule: TileUrlRule = {
    template: options.urlTemplate ?? '',
    subdomains: options.subdomains ?? [],
    hosts: options.hosts,
    flipY: options.urlRule === 'tencent',
    customTags: options.customTags
  }

  return {
    layerId: raw._id ?? 'tiles',
    projection,
    urlRule: rule
  }
}
