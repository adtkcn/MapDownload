import type * as MaptalksType from 'maptalks/src/index.ts'
type BaseMapConfig = {
  // config: Array<MaptalksType.Layer> | MaptalksType.Layer
  projection: MaptalksType.Projection
  tileLayer: Array<MaptalksType.Layer> | MaptalksType.Layer
  maxZoom: number
  minZoom: number
}
export type saveParam = {
  savePath: string
  minZoom: number
  maxZoom: number
  mergeLayers: boolean
  extent: {
    xmin: number
    ymin: number
    xmax: number
    ymax: number
  }
  imageType: string

  mapConfig: BaseMapConfig
}
