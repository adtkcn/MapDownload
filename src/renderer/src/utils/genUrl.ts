import type * as MaptalksType from 'maptalks/src/index.ts'

/**
 * 生成地图瓦片URL
 * @param {number} x - 瓦片X坐标
 * @param {number} y - 瓦片Y坐标
 * @param {number} z - 缩放级别
 * @returns {string} 瓦片URL
 */
function getTileUrl(layer: MaptalksType.TileLayer, x: number, y: number, z: number) {
  return layer.getTileUrl(x, y, z)
}

export class TileGenerator {
  layer: MaptalksType.TileLayer
  constructor(layer: MaptalksType.TileLayer) {
    this.layer = layer
  }
  /**
   * 将经纬度转换为地图瓦片坐标
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   * @param {number} zoom - 缩放级别
   * @returns {Object} 瓦片坐标 { x, y }
   */
  lngLatToTile(lng, lat, zoom) {
    const n = Math.pow(2, zoom)
    // 计算瓦片X坐标
    const x = Math.floor(((lng + 180) / 360) * n)
    // 计算瓦片Y坐标
    const latRad = (lat * Math.PI) / 180
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    )
    return { x, y }
  }
  /**
   * 根据经纬度范围和缩放级别获取所有瓦片URL
   * @param {Array} bounds - 经纬度范围 [minLng, minLat, maxLng, maxLat]
   * @param {number} zoom - 缩放级别
   * @returns {Array} 瓦片URL列表
   */
  getTileUrls(bounds: number[], zoom: number) {
    const [minLng, minLat, maxLng, maxLat] = bounds

    // 计算瓦片坐标范围
    const startTile = this.lngLatToTile(minLng, maxLat, zoom) // 左上角瓦片
    const endTile = this.lngLatToTile(maxLng, minLat, zoom) // 右下角瓦片

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
          url: getTileUrl(this.layer, x, y, zoom)
        })
      }
    }
    return urls
  }
}

/**
 * 百度地图瓦片URL生成工具
 * 基于BD-09坐标系和百度自定义瓦片网格
 */

export class BaiduTileGenerator {
  layer: MaptalksType.TileLayer
  MC_BAND: number[]
  LL_BAND: number[]
  LL2MC: number[][]
  constructor(layer: MaptalksType.TileLayer) {
    // 百度地图的投影参数
    this.layer = layer

    this.MC_BAND = [12890594.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0]
    this.LL_BAND = [75, 60, 45, 30, 15, 0]
    this.LL2MC = [
      [
        -0.0015702102444, 111320.7020616939, 1704480524535203, -10338987376042340,
        26112667856603880, -35149669176653700, 26595700718403920, -10725012454188240,
        1800819912950474, 82.5
      ],
      [
        0.0008277824516172526, 111320.7020463578, 647795574.6671607, -4082003173.641316,
        10774905663.51142, -15171875531.51559, 12053065338.62167, -5124939663.577472,
        913311935.9512032, 67.5
      ],
      [
        0.00337398766765, 111320.7020202162, 4481351.045890365, -23393751.19931662,
        79682215.47186455, -115964993.2797253, 97236711.15602145, -43661946.33752821,
        8477230.501135234, 52.5
      ],
      [
        0.00220636496208, 111320.7020209128, 51751.86112841131, 3796837.749470245,
        992013.7397791013, -1221952.21711287, 1340652.697009075, -620943.6990984312,
        144416.9293806241, 37.5
      ],
      [
        -0.0003441963504368392, 111320.7020576856, 278.2353980772752, 2485758.690035394,
        6070.750963243378, 54821.18345352118, 9540.606633304236, -2710.55326746645,
        1405.483844121726, 22.5
      ],
      [
        -0.0003218135878613132, 111320.7020701615, 0.00369383431289, 823725.6402795718,
        0.46104986909093, 2351.343141331292, 1.58060784298199, 8.77738589078284, 0.37238884252424,
        7.45
      ]
    ]
  }

  /**
   * 将BD-09经纬度转换为百度墨卡托坐标
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   * @returns {Object} 墨卡托坐标 {x, y}
   */
  convertLL2MC(lng, lat) {
    // 限制纬度范围
    const tempLat = Math.max(Math.min(lat, 74), -74)
    const tempLng = lng

    // 选择对应的转换参数
    let params: number[] | null = null
    for (let i = 0; i < this.LL_BAND.length; i++) {
      if (tempLat >= this.LL_BAND[i]) {
        params = this.LL2MC[i]
        break
      }
    }

    if (!params) {
      for (let i = this.LL_BAND.length - 1; i >= 0; i--) {
        if (tempLat <= -this.LL_BAND[i]) {
          params = this.LL2MC[i]
          break
        }
      }
    }

    // 坐标转换计算[7](@ref)
    const x = Math.abs(tempLng)
    const y = Math.abs(tempLat)
    if (!params) {
      throw new Error('Invalid latitude or longitude')
    }
    const factorX = params[0] + params[1] * x
    let factorY = y / params[9]
    factorY =
      params[2] +
      params[3] * factorY +
      params[4] * Math.pow(factorY, 2) +
      params[5] * Math.pow(factorY, 3) +
      params[6] * Math.pow(factorY, 4) +
      params[7] * Math.pow(factorY, 5) +
      params[8] * Math.pow(factorY, 6)

    const mcX = factorX * (tempLng < 0 ? -1 : 1)
    const mcY = factorY * (tempLat < 0 ? -1 : 1)

    return { x: mcX, y: mcY }
  }

  /**
   * 将墨卡托坐标转换为瓦片坐标
   * @param {number} mcX - 墨卡托X坐标
   * @param {number} mcY - 墨卡托Y坐标
   * @param {number} zoom - 缩放级别
   * @returns {Object} 瓦片坐标 {x, y}
   */
  convertMC2Tile(mcX, mcY, zoom) {
    // 百度地图分辨率计算[6](@ref)
    const resolution = Math.pow(2, 18 - zoom)
    const pixelX = mcX / resolution
    const pixelY = mcY / resolution

    const tileX = Math.floor(pixelX / 256)
    const tileY = Math.floor(pixelY / 256)

    return { x: tileX, y: tileY }
  }

  /**
   * 将经纬度直接转换为瓦片坐标
   * @param {number} lng - 经度
   * @param {number} lat - 纬度
   * @param {number} zoom - 缩放级别
   * @returns {Object} 瓦片坐标 {x, y}
   */
  lngLatToTile(lng, lat, zoom) {
    const mcCoord = this.convertLL2MC(lng, lat)
    return this.convertMC2Tile(mcCoord.x, mcCoord.y, zoom)
  }

  /**
   * 生成百度地图瓦片URL
   * @param {number} x - 瓦片X坐标
   * @param {number} y - 瓦片Y坐标
   * @param {number} z - 缩放级别
   * @param {string} style - 地图样式
   * @returns {string} 瓦片URL
   */
  getTileUrl(x, y, z) {
    // 处理负数坐标（百度使用M前缀表示负数）[4](@ref)
    // const tileX = x < 0 ? `M${-x}` : x
    // const tileY = y < 0 ? `M${-y}` : y

    // 随机选择子域名以实现负载均衡
    // const subdomains = ['0', '1', '2', '3']
    // const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)]
    return getTileUrl(this.layer, x, y, z)
    // 百度地图瓦片URL格式[3,5](@ref)
    // return `http://online${subdomain}.map.bdimg.com/onlinelabel/?qt=tile&x=${tileX}&y=${tileY}&z=${z}&styles=${style}&udt=20231105&scaler=1&p=0`
    // return `https://gss${subdomain}.bdstatic.com/8bo_dTSlRsgBo1vgoIiO_jowehsv/tile/?qt=tile&x=${tileX}&y=${tileY}&z=${z}&styles=${style}&scaler=1&udt=20170927`
  }

  /**
   * 根据经纬度范围获取所有瓦片URL
   * @param {Array} bounds - 经纬度范围 [minLng, minLat, maxLng, maxLat]
   * @param {number} zoom - 缩放级别
   * @param {string} style - 地图样式
   * @returns {Array} 瓦片URL数组
   */
  getTileUrlsByBounds(bounds, zoom) {
    const [minLng, minLat, maxLng, maxLat] = bounds

    // 计算四个角的瓦片坐标
    const nwTile = this.lngLatToTile(minLng, maxLat, zoom) // 西北角
    const seTile = this.lngLatToTile(maxLng, minLat, zoom) // 东南角

    // 获取瓦片坐标范围
    const startX = Math.min(nwTile.x, seTile.x)
    const endX = Math.max(nwTile.x, seTile.x)
    const startY = Math.min(nwTile.y, seTile.y)
    const endY = Math.max(nwTile.y, seTile.y)

    // 生成所有瓦片URL
    const urls: { z: number; x: number; y: number; url: string }[] = []
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        urls.push({
          z: zoom,
          x,
          y,
          url: this.getTileUrl(x, y, zoom)
        })
      }
    }

    return urls
  }
}

// 使用示例
// const tileGenerator = new BaiduTileGenerator()

// // // 示例1：获取单个点的瓦片URL
// // const testLng = 116.404 // 经度（北京）
// // const testLat = 39.915 // 纬度
// // const testZoom = 10 // 缩放级别

// // const tileCoord = tileGenerator.lngLatToTile(testLng, testLat, testZoom)
// // const tileUrl = tileGenerator.getTileUrl(tileCoord.x, tileCoord.y, testZoom)

// // console.log('瓦片坐标:', tileCoord)
// // console.log('瓦片URL:', tileUrl)

// // 示例2：根据范围获取瓦片URL
// const bounds = [116.3, 39.8, 116.5, 40.0] // [minLng, minLat, maxLng, maxLat]
// const zoomLevel = 12
// const tileUrls = tileGenerator.getTileUrlsByBounds(bounds, zoomLevel)

// console.log(`共获取 ${tileUrls.length} 个瓦片`)
// console.log('前5个瓦片URL:', tileUrls.slice(0, 5))
