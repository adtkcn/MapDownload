/**
 * 瓦片坐标计算
 * 由渲染进程下沉而来，逻辑与 utils/genUrl.ts 保持一致
 */

export type TileBounds = {
  x0: number
  y0: number
  x1: number
  y1: number
}

export type Extent = [number, number, number, number] // [xmin, ymin, xmax, ymax]

/** Web 墨卡托：经纬度 → 瓦片坐标 */
export function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

// ---------------- 百度 BD-09 ----------------

const LL_BAND = [75, 60, 45, 30, 15, 0]
const LL2MC = [
  [
    -0.0015702102444, 111320.7020616939, 1704480524535203, -10338987376042340, 26112667856603880,
    -35149669176653700, 26595700718403920, -10725012454188240, 1800819912950474, 82.5
  ],
  [
    0.0008277824516172526, 111320.7020463578, 647795574.6671607, -4082003173.641316,
    10774905663.51142, -15171875531.51559, 12053065338.62167, -5124939663.577472, 913311935.9512032,
    67.5
  ],
  [
    0.00337398766765, 111320.7020202162, 4481351.045890365, -23393751.19931662, 79682215.47186455,
    -115964993.2797253, 97236711.15602145, -43661946.33752821, 8477230.501135234, 52.5
  ],
  [
    0.00220636496208, 111320.7020209128, 51751.86112841131, 3796837.749470245, 992013.7397791013,
    -1221952.21711287, 1340652.697009075, -620943.6990984312, 144416.9293806241, 37.5
  ],
  [
    -0.0003441963504368392, 111320.7020576856, 278.2353980772752, 2485758.690035394,
    6070.750963243378, 54821.18345352118, 9540.606633304236, -2710.55326746645, 1405.483844121726,
    22.5
  ],
  [
    -0.0003218135878613132, 111320.7020701615, 0.00369383431289, 823725.6402795718,
    0.46104986909093, 2351.343141331292, 1.58060784298199, 8.77738589078284, 0.37238884252424, 7.45
  ]
]

/** BD-09 经纬度 → 百度墨卡托 */
function convertLL2MC(lng: number, lat: number): { x: number; y: number } {
  const tempLat = Math.max(Math.min(lat, 74), -74)
  const tempLng = lng

  let params: number[] | null = null
  for (let i = 0; i < LL_BAND.length; i++) {
    if (tempLat >= LL_BAND[i]) {
      params = LL2MC[i]
      break
    }
  }
  if (!params) {
    for (let i = LL_BAND.length - 1; i >= 0; i--) {
      if (tempLat <= -LL_BAND[i]) {
        params = LL2MC[i]
        break
      }
    }
  }

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

  return {
    x: factorX * (tempLng < 0 ? -1 : 1),
    y: factorY * (tempLat < 0 ? -1 : 1)
  }
}

/** 百度墨卡托 → 瓦片坐标 */
function convertMC2Tile(mcX: number, mcY: number, zoom: number): { x: number; y: number } {
  const resolution = Math.pow(2, 18 - zoom)
  return {
    x: Math.floor(mcX / resolution / 256),
    y: Math.floor(mcY / resolution / 256)
  }
}

/** BD-09 经纬度 → 百度瓦片坐标 */
export function baiduLngLatToTile(
  lng: number,
  lat: number,
  zoom: number
): { x: number; y: number } {
  const mc = convertLL2MC(lng, lat)
  return convertMC2Tile(mc.x, mc.y, zoom)
}

// ---------------- 范围计算 ----------------

/**
 * 计算某个层级下需要下载的瓦片范围
 */
export function tileBounds(extent: Extent, zoom: number, isBaidu: boolean): TileBounds {
  const [minLng, minLat, maxLng, maxLat] = extent

  if (isBaidu) {
    const nw = baiduLngLatToTile(minLng, maxLat, zoom)
    const se = baiduLngLatToTile(maxLng, minLat, zoom)
    return {
      x0: Math.min(nw.x, se.x),
      x1: Math.max(nw.x, se.x),
      y0: Math.min(nw.y, se.y),
      y1: Math.max(nw.y, se.y)
    }
  }

  const start = lngLatToTile(minLng, maxLat, zoom)
  const end = lngLatToTile(maxLng, minLat, zoom)
  const maxTile = Math.pow(2, zoom) - 1
  const clamp = (v: number) => Math.min(Math.max(v, 0), maxTile)
  return {
    x0: clamp(start.x),
    x1: clamp(end.x),
    y0: clamp(start.y),
    y1: clamp(end.y)
  }
}

export function isBaiduProjection(projection?: string): boolean {
  return projection === 'BAIDU'
}
