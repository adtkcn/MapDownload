import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { utilityProcess } from 'electron'
import type {
  DownloadJob,
  DownloadProgress,
  WorkerInMessage,
  WorkerOutMessage
} from '../shared/downloadTypes'
import { DownloadEngine } from '../download/engine'

/** 下载子进程产物名，与 electron.vite.config.ts 的入口保持一致 */
const WORKER_ENTRY = 'downloadWorker.js'

export type DownloadBridgeHooks = {
  onProgress: (progress: DownloadProgress) => void
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => void
}

type Runner = {
  post(message: WorkerInMessage): void
  dispose(): void
}

/**
 * 主进程侧的下载桥接
 *
 * 正常情况下把任务转交给独立的 utilityProcess，主进程只转发进度；
 * 若子进程产物缺失（例如构建配置未生效），自动回退到主进程内执行，
 * 保证功能可用，只是隔离性下降。
 */
export class DownloadBridge {
  private runner: Runner | null = null

  constructor(private readonly hooks: DownloadBridgeHooks) {}

  start(job: DownloadJob): void {
    this.ensureRunner()
    this.runner?.post({ type: 'start', job })
  }

  pause(): void {
    this.runner?.post({ type: 'pause' })
  }

  resume(): void {
    this.runner?.post({ type: 'resume' })
  }

  stop(): void {
    this.runner?.post({ type: 'stop' })
  }

  dispose(): void {
    this.runner?.dispose()
    this.runner = null
  }

  private ensureRunner(): void {
    if (this.runner) return

    const workerPath = this.resolveWorkerPath()
    if (workerPath) {
      try {
        this.runner = this.spawn(workerPath)
        return
      } catch (error) {
        this.log('warn', `启动下载子进程失败，回退主进程：${String(error)}`)
      }
    } else {
      this.log('warn', '未找到下载子进程产物，回退到主进程内下载')
    }

    this.runner = this.createInlineRunner()
  }

  /** 兼容不同的产物目录结构（[name].js 或 [name]/index.js） */
  private resolveWorkerPath(): string | null {
    const candidates = [
      join(__dirname, WORKER_ENTRY),
      join(__dirname, 'downloadWorker', 'index.js')
    ]
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate
    }
    return null
  }

  private spawn(workerPath: string): Runner {
    const child = utilityProcess.fork(workerPath, [], { stdio: 'pipe' })

    child.on('message', (message: WorkerOutMessage) => this.handleMessage(message))
    child.on('exit', (code: number) => {
      this.log('info', `下载子进程退出，code=${code}`)
      this.runner = null
    })
    child.stdout?.on('data', (chunk: Buffer) => this.log('info', String(chunk).trim()))
    child.stderr?.on('data', (chunk: Buffer) => this.log('error', String(chunk).trim()))

    this.log('info', '下载子进程已启动')
    return {
      post: (message) => child.postMessage(message),
      dispose: () => child.kill()
    }
  }

  private createInlineRunner(): Runner {
    const engine = new DownloadEngine(
      (progress) => this.hooks.onProgress(progress),
      (level, message) => this.log(level, message)
    )
    return {
      post: (message) => {
        switch (message.type) {
          case 'start':
            void engine.start(message.job).catch((error: unknown) => {
              this.log('error', `下载任务异常：${String(error)}`)
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
      },
      dispose: () => engine.stop()
    }
  }

  private handleMessage(message: WorkerOutMessage): void {
    if (!message) return
    if (message.type === 'progress') {
      this.hooks.onProgress(message.progress)
    } else if (message.type === 'log') {
      this.log(message.level, message.message)
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string): void {
    this.hooks.onLog?.(level, message)
  }
}
