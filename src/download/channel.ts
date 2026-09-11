import type { WorkerInMessage, WorkerOutMessage } from '../shared/downloadTypes'

/** 下载进程与父进程之间的消息通道抽象 */
export type WorkerChannel = {
  post(message: WorkerOutMessage): void
  onMessage(handler: (message: WorkerInMessage) => void): void
}

type ParentPortLike = {
  postMessage(message: unknown): void
  on(event: 'message', listener: (event: { data: unknown }) => void): void
}

/**
 * utilityProcess 中 Electron 会挂上 process.parentPort
 * 这里不直接 require('electron')，保持子进程轻量
 */
export function createParentPortChannel(): WorkerChannel | null {
  const parentPort = (process as NodeJS.Process & { parentPort?: ParentPortLike }).parentPort
  if (!parentPort) return null
  return {
    post: (message) => parentPort.postMessage(message),
    onMessage: (handler) =>
      parentPort.on('message', (event) => handler(event.data as WorkerInMessage))
  }
}
