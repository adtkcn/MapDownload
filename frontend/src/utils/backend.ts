/**
 * 后端调用适配层
 *
 * 所有对 Go 的调用都收敛到这里，组件不直接依赖生成的 bindings，
 * 方便后续替换实现或做兼容处理。
 */
import { Events } from '@wailsio/runtime'
import { DownloadService } from '../../bindings/map'
import type { DownloadJob, DownloadProgress } from './downloadTypes'

const PROGRESS_EVENT = 'download:progress'

/** 下发下载任务，返回任务 ID（用于后续暂停/继续/停止/调并发） */
export async function startDownload(job: DownloadJob): Promise<string> {
  return await DownloadService.StartDownload(job)
}

export function pauseDownload(id: string): void {
  void DownloadService.PauseDownload(id)
}

export function resumeDownload(id: string): void {
  void DownloadService.ResumeDownload(id)
}

export function stopDownload(id: string): void {
  void DownloadService.StopDownload(id)
}

/** 运行时调整指定任务的并发 worker 数 */
export function setConcurrency(id: string, n: number): void {
  void DownloadService.SetConcurrency(id, n)
}

/** 选择保存目录，返回空字符串表示用户取消 */
export async function selectFolder(): Promise<string> {
  return await DownloadService.SelectFolder()
}

export function onDownloadProgress(callback: (progress: DownloadProgress) => void): void {
  Events.On(PROGRESS_EVENT, (event: { data: DownloadProgress }) => callback(event.data))
}
