/**
 * 主进程 / 下载子进程 / 渲染进程 共享的类型定义
 */

/**
 * 瓦片 URL 生成规则
 * 与 maptalks TileLayer.getTileUrl 的行为保持一致：
 * - {x} {y} {z}：瓦片坐标
 * - {s}：子域名，取 subdomains[(x + y) % length]
 * - {m} {n}：腾讯系图层专用，floor(x / 16)、floor(y / 16)
 * - 其余占位符从 customTags 取值
 */
export type TileUrlRule = {
  /** URL 模板，如 https://webrd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z} */
  template: string
  /** 子域名池，用于 {s} 替换，如 [1, 3, 4] */
  subdomains?: Array<string | number>
  /** 主机名池，命中后整体替换 URL 的 host 实现多域名轮转，如 t0~t7.tianditu.gov.cn */
  hosts?: string[]
  /** TMS 翻转：y = 2^z - 1 - y（腾讯系图层） */
  flipY?: boolean
  /** 对应 maptalks 的 token / customTags */
  customTags?: Record<string, string | number>
}

/** 单个待下载的图层 */
export type TileSource = {
  /** 图层 id，同时作为输出子目录名 */
  layerId: string
  /** 投影代码，BAIDU 时使用 BD-09 反算瓦片范围 */
  projection: string
  urlRule: TileUrlRule
}

/** 一次完整的下载任务 */
export type DownloadJob = {
  jobId: string
  /** 输出根目录 */
  rootPath: string
  sources: TileSource[]
  /** 下载范围 [xmin, ymin, xmax, ymax]，经纬度 */
  extent: [number, number, number, number]
  zMin: number
  zMax: number
  /** 文件扩展名，不含点，如 png */
  imageType: string
  /** 总并发请求数 */
  concurrency: number
  /** 同时写盘的文件数上限，避免打爆磁盘 */
  writeConcurrency: number
  /** 单片最大重试次数 */
  maxRetry: number
  /** 已存在的文件直接跳过 */
  skipExist: boolean
  /** 每个域名的最大并发连接数（keepAlive 连接池） */
  socketsPerHost: number
  /** 请求超时时间（毫秒） */
  timeoutMs: number
  referer?: string
}

export type ProgressState = 'running' | 'paused' | 'done' | 'stopped' | 'error'

export type DownloadProgress = {
  jobId: string
  state: ProgressState
  /** 当前正在下载的图层 */
  layerId: string
  /** 预计总瓦片数 */
  total: number
  success: number
  failed: number
  skipped: number
  retried: number
  /** 正在进行的请求数 */
  inFlight: number
  bytes: number
}

/** 主进程 → 下载进程 */
export type WorkerInMessage =
  | { type: 'start'; job: DownloadJob }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }

/** 下载进程 → 主进程 */
export type WorkerOutMessage =
  | { type: 'progress'; progress: DownloadProgress }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string }
