import http from 'node:http'
import https from 'node:https'

/**
 * keepAlive 连接池
 *
 * 之前的实现对 40 个请求里只有 1 个设置了 agent，绝大多数请求没有连接复用，
 * 导致每个瓦片都要重新 TCP + TLS 握手。这里保证每个请求都带上 agent。
 */

export type AgentPair = {
  http: http.Agent
  https: https.Agent
}

export type AgentOptions = {
  /** 每个域名的最大并发连接数 */
  socketsPerHost: number
  /** 空闲连接保活时间 */
  keepAliveMsecs?: number
}

export function createAgents(options: AgentOptions): AgentPair {
  const maxSockets = Math.max(1, options.socketsPerHost)
  return {
    http: new http.Agent({
      keepAlive: true,
      keepAliveMsecs: options.keepAliveMsecs ?? 30_000,
      maxSockets,
      maxFreeSockets: Math.max(4, Math.floor(maxSockets / 2)),
      scheduling: 'lifo',
      timeout: 60_000
    }),
    https: new https.Agent({
      keepAlive: true,
      keepAliveMsecs: options.keepAliveMsecs ?? 30_000,
      maxSockets,
      maxFreeSockets: Math.max(4, Math.floor(maxSockets / 2)),
      scheduling: 'lifo',
      timeout: 60_000
    })
  }
}

export function destroyAgents(agents: AgentPair): void {
  agents.http.destroy()
  agents.https.destroy()
}

// ---------------- 请求头伪装 ----------------

const USER_AGENTS = [
  'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
  'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Acoo Browser; SLCC1; .NET CLR 2.0.50727; Media Center PC 5.0; .NET CLR 3.0.04506)',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56 Safari/535.11',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.20 (KHTML, like Gecko) Chrome/19.0.1036.7 Safari/535.20',
  'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.0.8) Gecko Fedora/1.9.0.8-1.fc10 Kazehakase/0.5.6',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.71 Safari/537.1 LBBROWSER',
  'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729)',
  'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
  'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/5.0; SLCC2; QQBrowser/7.0.3698.400)',
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:2.0b13pre) Gecko/20110307 Firefox/4.0b13pre',
  'Opera/9.80 (Macintosh; Intel Mac OS X 10.6.8; U; fr) Presto/2.9.168 Version/11.52',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export function randomForwardedFor(): string {
  const part = () => String(Math.floor(Math.random() * (255 - 10) + 10))
  return `${part()}.${part()}.${part()}.${part()}`
}
