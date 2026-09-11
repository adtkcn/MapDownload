import { createWriteStream } from 'node:fs'
import { mkdir, readdir, rename, unlink } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage } from 'node:http'

/** 目录级已存在文件缓存的上限，防止长时间任务内存无限增长 */
const MAX_CACHED_DIRS = 512

/**
 * 文件落盘
 *
 * 全部走异步 API，避免在事件循环里执行同步 stat / mkdir 把网络回调拖住。
 * 目录创建与"文件是否已存在"都按目录维度缓存，一列瓦片只做一次 readdir。
 */
export class FileSink {
  private readonly dirCache = new Set<string>()
  private readonly existCache = new Map<string, Set<string>>()
  private activeWrites = 0
  private readonly waiters: Array<() => void> = []

  constructor(private readonly writeConcurrency: number) {}

  async ensureDir(dir: string): Promise<void> {
    if (this.dirCache.has(dir)) return
    await mkdir(dir, { recursive: true })
    this.dirCache.add(dir)
  }

  /** 读取某个瓦片列目录下已存在的文件名，同列内只读取一次 */
  async columnExists(dir: string): Promise<Set<string>> {
    const cached = this.existCache.get(dir)
    if (cached) return cached

    let names: string[] = []
    try {
      names = await readdir(dir)
    } catch {
      names = []
    }
    const set = new Set(names)
    this.trackCache(dir, set)
    return set
  }

  /** 一个瓦片列处理完毕后释放其缓存 */
  endColumn(dir: string): void {
    this.existCache.delete(dir)
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

      const dir = dirname(dest)
      const cached = this.existCache.get(dir)
      if (cached) cached.add(basename(dest))

      return bytes
    } catch (error) {
      await unlink(tmp).catch(() => undefined)
      throw error
    } finally {
      this.release()
    }
  }

  private trackCache(dir: string, set: Set<string>): void {
    if (this.existCache.size >= MAX_CACHED_DIRS) {
      const oldest = this.existCache.keys().next().value
      if (oldest !== undefined) this.existCache.delete(oldest)
    }
    this.existCache.set(dir, set)
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
