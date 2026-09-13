import type * as MaptalksType from 'maptalks/src/index.ts'
type BaseMapConfig = {
  projection: MaptalksType.Projection
  tileLayer: Array<MaptalksType.Layer>
  maxZoom: number
  minZoom: number
}

/** 下载范围（地图包围盒） */
export type DownloadExtent = {
  xmin: number
  ymin: number
  xmax: number
  ymax: number
}

export type saveParam = {
  savePath: string
  minZoom: number
  maxZoom: number
  mergeLayers: boolean
  extent: DownloadExtent
  /** 下载并发数，由用户在下载对话框中设定，向下透传到 DownloadJob */
  concurrency: number

  mapConfig: BaseMapConfig
}

/**
 * 下载对话框提交的参数。
 * 与 saveParam 的区别：此时还没从地图实例上取 mapConfig，
 * 且未绘制范围时 extent 的字段可能不完整。
 */
export type SaveFormParam = Omit<saveParam, 'extent' | 'mapConfig'> & {
  extent: Partial<DownloadExtent>
}
