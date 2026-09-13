import TdtTileLayer from './tilelayers/TdtTileLayer'
import GeoqTileLayer from './tilelayers/GeoqTileLayer'
import GoogleTileLayer from './tilelayers/GoogleTileLayer'
import AmapTileLayer from './tilelayers/AmapTileLayer'
import TencentTileLayer from './tilelayers/TencentTileLayer'
import OsmTileLayer from './tilelayers/OsmTileLayer'
import CartoDbTileLayer from './tilelayers/CartoDbTileLayer'
import MapboxTileLayer from './tilelayers/MapboxTileLayer'
import BaiduTileLayer from './tilelayers/BaiduTileLayer'
import { GroupTileLayer } from 'maptalks'
import Utils from './utils'

class TileLayerCollection {
  static getTdtTileLayer(options = {}) {
    const baselayers = []
    const baseLayer = new TdtTileLayer(options)
    baselayers.push(baseLayer)

    if (options.style) {
      options.style = options.style + '_Label'
      const baseLayer1 = new TdtTileLayer(options)
      baselayers.push(baseLayer1)
    }

    return new GroupTileLayer(Utils.uuid(), baselayers, {
      attribution: options.attribution
    })
  }

  static getGeoqTileLayer(options = {}) {
    const baseLayer = new GeoqTileLayer(options.style, options)
    return baseLayer
  }

  static getGoogleTileLayer(options = {}) {
    const baseLayer = new GoogleTileLayer(options.style, options)
    return baseLayer
  }

  static getAmapTileLayer(options = {}) {
    if (options.style === 'Amap_Satellite') {
      const baseLayers = []
      const baseLayer = new AmapTileLayer(options.style, options)
      baseLayers.push(baseLayer)
      options.style = options.style + '_Label'
      const baseLayer1 = new AmapTileLayer(options.style, options)
      baseLayers.push(baseLayer1)
      return new GroupTileLayer(Utils.uuid(), baseLayers, {
        attribution: options.attribution
      })
    } else {
      return new AmapTileLayer(options.style, options)
    }
  }

  static getTencentTileLayer(options = {}) {
    if (options.style === 'Tencent_Normal') {
      return new TencentTileLayer(options.style, options)
    } else {
      const baseLayers = []
      const baseLayer = new TencentTileLayer(options.style, options)
      baseLayers.push(baseLayer)
      options.style = options.style + '_Label'
      const baseLayer1 = new TencentTileLayer(options.style, options)
      baseLayers.push(baseLayer1)
      return new GroupTileLayer(Utils.uuid(), baseLayers, {
        attribution: options.attribution
      })
    }
  }

  static getOsmTileLayer(options = {}) {
    return new OsmTileLayer(options.style, options)
  }

  static getCartoDbTileLayer(options = {}) {
    return new CartoDbTileLayer(options.style, options)
  }

  static getMapboxTileLayer(options = {}) {
    return new MapboxTileLayer(options.style, options)
  }

  static getBaiduTileLayer(options = {}) {
    return new BaiduTileLayer(options.style, options)
  }
}

export default TileLayerCollection
