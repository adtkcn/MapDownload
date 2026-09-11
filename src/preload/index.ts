import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { DownloadJob, DownloadProgress } from '../shared/downloadTypes'

export const api = {
  /** 一次性下发整个下载任务，URL 生成与下载都在下载子进程内完成 */
  downloadStart: (job: DownloadJob): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('download:start', job),
  downloadPause: (): void => ipcRenderer.send('download:pause'),
  downloadResume: (): void => ipcRenderer.send('download:resume'),
  downloadStop: (): void => ipcRenderer.send('download:stop'),
  onDownloadProgress: (callback: (progress: DownloadProgress) => void): void => {
    ipcRenderer.on('download:progress', (_event: Electron.IpcRendererEvent, data) =>
      callback(data as DownloadProgress)
    )
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
