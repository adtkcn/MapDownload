/**
 * 下载任务相关类型（前端侧定义，与 Go internal/model 结构严格保持一致）
 */

export interface TileUrlRule {
  template: string
  subdomains?: any[] | null
  hosts?: string[] | null
  flipY?: boolean
  customTags?: Record<string, any> | null
}

export interface TileSource {
  layerId: string
  projection: string
  urlRule: TileUrlRule
}

export interface DownloadJob {
  rootPath: string
  sources: TileSource[]
  extent: number[]
  zMin: number
  zMax: number
  concurrency: number
  writeConcurrency: number
  maxRetry: number
  skipExist: boolean
  socketsPerHost: number
  timeoutMs: number
  referer?: string
}

export type ProgressState = 'queued' | 'running' | 'paused' | 'done' | 'stopped' | 'error'

/** 队列中单个任务的进度快照 */
export interface TaskSummary {
  taskId: string
  layerId: string
  state: ProgressState
  total: number
  success: number
  failed: number
  skipped: number
  retried: number
  inFlight: number
  bytes: number
  concurrency: number
  /** 相对活动任务的位置：0=正在运行/暂停，>0 为等待中的排队序号 */
  queuePos: number
}

/** 下载进度（多任务队列快照） */
export interface DownloadProgress {
  taskId: string
  layerId: string
  state: ProgressState
  total: number
  success: number
  failed: number
  skipped: number
  retried: number
  inFlight: number
  bytes: number
  tasks: TaskSummary[]
}
