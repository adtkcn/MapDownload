/// <reference types="vite/client" />

import type { DownloadJob, DownloadProgress } from '@shared/downloadTypes'

declare global {
  interface Window {
    api: {
      downloadStart: (job: DownloadJob) => Promise<{ ok: boolean }>
      downloadPause: () => void
      downloadResume: () => void
      downloadStop: () => void
      onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void
    }
  }
}

export {}
