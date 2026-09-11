/**
 * 下载子进程入口
 *
 * 由主进程通过 utilityProcess.fork 启动，承担 URL 生成、HTTP 下载与磁盘写入，
 * 主进程只负责转发进度，不再参与任何密集计算。
 */
import { createParentPortChannel } from './channel'
import { DownloadEngine } from './engine'

const channel = createParentPortChannel()
if (!channel) {
  throw new Error('下载子进程必须使用 utilityProcess 启动')
}

const engine = new DownloadEngine(
  (progress) => channel.post({ type: 'progress', progress }),
  (level, message) => channel.post({ type: 'log', level, message })
)

channel.onMessage((message) => {
  switch (message.type) {
    case 'start':
      // start 是长任务，不能 await，否则无法继续响应 pause / stop
      void engine.start(message.job).catch((error: unknown) => {
        channel.post({
          type: 'log',
          level: 'error',
          message: `下载任务异常退出：${error instanceof Error ? error.message : String(error)}`
        })
      })
      break
    case 'pause':
      engine.pause()
      break
    case 'resume':
      engine.resume()
      break
    case 'stop':
      engine.stop()
      break
  }
})

process.on('uncaughtException', (error) => {
  channel.post({ type: 'log', level: 'error', message: `未捕获异常：${error.message}` })
})

channel.post({ type: 'log', level: 'info', message: '下载子进程已就绪' })
