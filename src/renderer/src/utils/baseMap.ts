// 地图
import 'maptalks/dist/maptalks.css'
import * as maptalks from 'maptalks'
import type * as MaptalksType from 'maptalks/src/index.ts'
import type { CommonProjectionType } from 'maptalks/src/geo/projection'

import TileLayerCollection from './TileLayerCollection/TileLayerCollection'
import { defaultMap } from './layerList'
import type { BaseLayerType } from './layerList'

// import booleanContains from '@turf/boolean-contains'
// import booleanCrosses from '@turf/boolean-crosses';
// import booleanDisjoint from '@turf/boolean-disjoint';
// import intersect from '@turf/intersect'
// import * as turf from '@turf/helpers'

const defaultTileOption = {
  maxCacheSize: 1000,
  tileRetryCount: 3, // 失败重试次数
  cascadeTiles: false,
  renderer: 'gl', // gl/canvas gl瓦片需跨域支持；canvas不需要
  debug: false, // 绘制瓦片边框
  crossOrigin: null, // 瓦片跨域
  repeatWorld: false
}
export default class baseMap {
  map: MaptalksType.Map
  _vectorLayer: MaptalksType.VectorLayer
  _drawTool?: MaptalksType.DrawTool

  constructor(id) {
    const map = new maptalks.Map(id, {
      center: [105.08052356963802, 36.04231948670001],
      zoom: 5,
      minZoom: 1,
      zoomControl: true, // 缩放控件
      scaleControl: true, // 比例尺控件
      fog: false,
      dragRotatePitch: false,
      dragRotate: false,
      dragPitch: false
    }) as MaptalksType.Map
    this._vectorLayer = new maptalks.VectorLayer('vector').addTo(map) as MaptalksType.VectorLayer
    this.map = map
    this.switchBaseLayer(defaultMap())
  }
  getMap() {
    return this.map
  }
  // 显示瓦片网格
  showTileGrid(bool: boolean) {
    const baseLayer = this.map.getBaseLayer()
    baseLayer.config({ debug: bool })
    baseLayer.hide()
    baseLayer.show()
  }

  switchBaseLayer(param: BaseLayerType) {
    const methodName = 'get' + param.parent + 'TileLayer'
    const style = param.layer.value
    const baseLayer = TileLayerCollection[methodName]({
      parentName: param.parent,
      style: style,
      ...defaultTileOption,
      // subdomains: param.layer.subdomains,
      // attribution: param.layer.attribution,
      ...param.layer.exteral
    })
    // const oldBaseLayer = this.map.getBaseLayer()
    // if (oldBaseLayer && oldBaseLayer.config()?.debug) {
    //   baseLayer.config({ debug: true })
    // }
    this.map.removeBaseLayer()
    this.map.setBaseLayer(baseLayer)
    this.map.setSpatialReference({
      projection: param.layer.prejection
    })

    // testDraw(this.map.getBaseLayer(), {x:24,y:12,z:5}); // 测试-绘制瓦片外框
  }
  // 绘制矩形、编辑矩形位置
  startDraw() {
    const map = this.map
    const isFirst = typeof this._drawTool === 'undefined'
    if (isFirst) {
      const layer = this._vectorLayer
      const drawTool: MaptalksType.DrawTool = new maptalks.DrawTool({
        mode: 'Rectangle',
        symbol: {
          lineColor: '#34495e',
          lineWidth: 2,
          polygonFill: 'rgb(135,196,240)',
          polygonOpacity: 0.6
        }
      })
        .addTo(map)
        .enable()
      this._drawTool = drawTool
      // eslint-disable-next-line
      drawTool.on('drawstart', function (param) {
        layer.clear()
      })
      drawTool.on('drawend', function (param) {
        layer.addGeometry(param?.geometry)
      })
    } else {
      this._drawTool?.enable()
    }
    this.map.setCursor('crosshair')
  }
  getDrawLayer() {
    return this._vectorLayer
  }
  // 结束绘制
  endDraw() {
    if (this._vectorLayer) {
      this._vectorLayer.clear()
      this._drawTool?.disable()
      this.map.resetCursor()
    }
  }
  // 获取下载范围
  getDownloadExtent() {
    // if (!this._vectorLayer) return null
    return this._vectorLayer.getExtent()
  }

  // 获取瓦片图层参数
  getBaseMapConfig(): {
    projection: CommonProjectionType
    tileLayer: Array<MaptalksType.TileLayer>
    maxZoom: number
    minZoom: number
  } {
    const baseMap = this.map.getBaseLayer()
    if (baseMap instanceof maptalks.GroupTileLayer) {
      const layers = (baseMap?.getLayers?.() || []) as Array<MaptalksType.TileLayer>
      return {
        projection: baseMap.getProjection(),
        tileLayer: layers,
        maxZoom: baseMap.getMaxZoom(),
        minZoom: baseMap.getMinZoom()
      }
    } else {
      return {
        projection: baseMap.getProjection(),
        tileLayer: [baseMap] as Array<MaptalksType.TileLayer>,
        maxZoom: baseMap.getMaxZoom(),
        minZoom: baseMap.getMinZoom()
      }
    }
  }
  // 添加geojson至地图
  addGeometry(geojson, events = false, cb = () => {}) {
    const geometry = maptalks.GeoJSON.toGeometry(geojson, (geo) => {
      const polygonStyle = {
        lineColor: '#34495e',
        lineWidth: 2,
        polygonFill: 'rgb(135,196,240)',
        polygonOpacity: 0.6
      }
      const labelStyle = {
        textName: '点击下载',
        textFill: '#34495e',
        textPlacement: 'polygon',
        textSize: 16
      }
      if (geo.getType() === 'MultiPolygon' && geo.getGeometries().length > 1) {
        geo.setSymbol({
          ...polygonStyle
        })
        geo.getGeometries()[0].setSymbol({
          ...polygonStyle,
          ...labelStyle
        })
      } else {
        geo.setSymbol({
          ...polygonStyle,
          ...labelStyle
        })
      }
    })
    this._vectorLayer.addGeometry(geometry)

    if (events && geometry && geometry.length > 0) {
      geometry[0].on('click', (event) => {
        if (typeof cb === 'function') cb(event)
      })
    }
  }
  // 自动适应地图范围
  fitExtent() {
    const extent = this._vectorLayer.getExtent()
    if (extent) {
      this.map.fitExtent(extent, 0)
    }
  }
}
