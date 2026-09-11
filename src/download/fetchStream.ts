import http from 'node:http'
import https from 'node:https'
import type { IncomingMessage } from 'node:http'
import type { AgentPair } from './httpPool'

export class TileRequestError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'TileRequestError'
    this.status = status
  }
}

export type TileRequestOptions = {
  url: string
  agents: AgentPair
  signal?: AbortSignal
  /** 整体超时（毫秒） */
  timeoutMs: number
  headers: Record<string, string>
  maxRedirects?: number
  /** 服务端返回 HTML 时视为失败，避免把错误页存成图片，默认开启 */
  rejectHtml?: boolean
}

export type TileResponse = {
  bytes: number
  status: number
}

/**
 * 发起瓦片请求，并把响应流交给 handler 消费。
 *
 * 关键点：响应以流的形式交给调用方（通常直接 pipeline 到文件），
 * 网络读取与磁盘写入同时进行，不需要把整块数据缓冲在内存里。
 */
export async function requestTile(
  options: TileRequestOptions,
  handler: (res: IncomingMessage) => Promise<number>
): Promise<TileResponse> {
  const maxRedirects = options.maxRedirects ?? 3
  let url = options.url

  for (let redirect = 0; ; redirect++) {
    const res = await open(url, options)
    const status = res.statusCode ?? 0

    if (status >= 300 && status < 400) {
      const location = res.headers.location
      res.resume() // 丢弃响应体，让连接回到 keepAlive 池
      if (!location) {
        throw new TileRequestError(`重定向缺少 location: ${url}`, status)
      }
      if (redirect >= maxRedirects) {
        throw new TileRequestError(`重定向次数过多: ${url}`, status)
      }
      url = new URL(location, url).toString()
      continue
    }

    if (status !== 200) {
      res.resume()
      throw new TileRequestError(`HTTP ${status}: ${url}`, status)
    }

    const contentType = String(res.headers['content-type'] ?? '')
    if (options.rejectHtml !== false && contentType.toLowerCase().includes('text/html')) {
      res.resume()
      throw new TileRequestError(`返回了 HTML 错误页: ${url}`, status)
    }

    try {
      const bytes = await handler(res)
      return { bytes, status }
    } catch (error) {
      res.destroy()
      throw error
    }
  }
}

function open(url: string, options: TileRequestOptions): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:')
    const client = isHttps ? https : http

    const req = client.request(
      url,
      {
        method: 'GET',
        agent: isHttps ? options.agents.https : options.agents.http,
        headers: options.headers,
        timeout: options.timeoutMs
      },
      resolve
    )

    req.on('error', reject)
    req.setTimeout(options.timeoutMs, () => {
      req.destroy(new TileRequestError(`请求超时: ${url}`))
    })

    const signal = options.signal
    if (signal) {
      if (signal.aborted) {
        req.destroy(new TileRequestError('任务已取消'))
        return
      }
      const onAbort = (): void => {
        req.destroy(new TileRequestError('任务已取消'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      req.on('close', () => signal.removeEventListener('abort', onAbort))
    }

    req.end()
  })
}
