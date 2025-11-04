import type * as MaptalksType from 'maptalks/src/index.ts'
/**
 * 将经纬度转换为高德地图瓦片坐标
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @param {number} zoom - 缩放级别
 * @returns {Object} 瓦片坐标 { x, y }
 */
function lngLatToTile(lng, lat, zoom) {
  const n = Math.pow(2, zoom)
  // 计算瓦片X坐标
  const x = Math.floor(((lng + 180) / 360) * n)
  // 计算瓦片Y坐标
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

/**
 * 生成高德地图瓦片URL
 * @param {number} x - 瓦片X坐标
 * @param {number} y - 瓦片Y坐标
 * @param {number} z - 缩放级别
 * @returns {string} 瓦片URL
 */
function getGaodeTileUrl(layer: MaptalksType.TileLayer, x: number, y: number, z: number) {
  // 随机选择子域名（1-4）以平衡负载
  // const subdomain = Math.floor(Math.random() * 4) + 1
  // return `https://wprd0${subdomain}.is.autonavi.com/appmaptile?x=${x}&y=${y}&z=${z}&lang=zh_cn&style=8`
  return layer.getTileUrl(x, y, z)
}

/**
 * 根据经纬度范围和缩放级别获取所有瓦片URL
 * @param {Array} bounds - 经纬度范围 [minLng, minLat, maxLng, maxLat]
 * @param {number} zoom - 缩放级别
 * @returns {Array} 瓦片URL列表
 */
export function getGaodeTileUrls(layer: MaptalksType.TileLayer, bounds: number[], zoom: number) {
  const [minLng, minLat, maxLng, maxLat] = bounds

  // 计算瓦片坐标范围
  const startTile = lngLatToTile(minLng, maxLat, zoom) // 左上角瓦片
  const endTile = lngLatToTile(maxLng, minLat, zoom) // 右下角瓦片

  // 限制瓦片坐标在有效范围内 [0, 2^zoom - 1]
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max)
  const maxTile = Math.pow(2, zoom) - 1
  const startX = clamp(startTile.x, 0, maxTile)
  const endX = clamp(endTile.x, 0, maxTile)
  const startY = clamp(startTile.y, 0, maxTile)
  const endY = clamp(endTile.y, 0, maxTile)

  // 生成所有瓦片的URL
  const urls: { z: number; x: number; y: number; url: string }[] = []
  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      urls.push({
        z: zoom,
        x,
        y,
        url: getGaodeTileUrl(layer, x, y, zoom)
      })
    }
  }
  return urls
}
