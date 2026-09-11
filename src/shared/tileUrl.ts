import type { TileUrlRule } from './downloadTypes'

const PLACEHOLDER = /\{([^{}]+)\}/g
const HOST_PART = /^([a-zA-Z][a-zA-Z\d+\-.]*:\/\/)([^/?#]+)/

/**
 * 生成瓦片 URL
 *
 * 下沉到主进程/下载进程后不再依赖 maptalks，这里完整复刻其替换规则。
 *
 * @param hostOffset 额外的轮转偏移，重写时递增即可自动切换到下一个域名，
 *                   基础偏移为 (x + y)，与 maptalks 的 {s} 取值规则一致。
 */
export function buildTileUrl(
  rule: TileUrlRule,
  z: number,
  x: number,
  y: number,
  hostOffset = 0
): string {
  const ty = rule.flipY ? Math.pow(2, z) - 1 - y : y
  const subdomains = rule.subdomains ?? []
  let domain = ''
  if (subdomains.length > 0) {
    const idx = mod(x + y, subdomains.length)
    domain = String(subdomains[idx])
  }

  const data: Record<string, string | number> = {
    x,
    y: ty,
    z,
    s: domain,
    m: Math.floor(x / 16),
    n: Math.floor(ty / 16)
  }
  if (rule.customTags) {
    Object.assign(data, rule.customTags)
  }

  let url = rule.template.replace(PLACEHOLDER, (raw, key: string) => {
    const value = data[key]
    return value === undefined ? raw : String(value)
  })

  const hosts = rule.hosts
  if (hosts && hosts.length > 0) {
    const host = hosts[mod(x + y + hostOffset, hosts.length)]
    url = url.replace(HOST_PART, (_m, scheme: string) => scheme + host)
  }
  return url
}

/**
 * 该规则是否支持多域名轮转（用于重试时切换域名）
 */
export function rotatableCount(rule: TileUrlRule): number {
  return rule.hosts?.length ?? 0
}

function mod(value: number, len: number): number {
  const r = value % len
  return r < 0 ? r + len : r
}
