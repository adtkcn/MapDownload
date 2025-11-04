// import { useMessage } from 'naive-ui'

import type * as MaptalksType from 'maptalks/src/index.ts'
import type { saveParam } from '../components/types'
import { downloadImage } from './download'
import { getGaodeTileUrls } from './genUrl'
/**
 * 下载TMS瓦片
 */
export class TileTMS {
  rootPath: string
  maxZoom: number
  minZoom: number
  imageType: string
  extent: number[]
  tileLayer: MaptalksType.TileLayer

  constructor(data: saveParam) {
    this.rootPath = data.savePath // 文件根目录
    this.maxZoom = data.maxZoom
    this.minZoom = data.minZoom
    this.imageType = data.imageType
    this.tileLayer = data.mapConfig.tileLayer as MaptalksType.TileLayer
    this.extent = [data.extent.xmin, data.extent.ymin, data.extent.xmax, data.extent.ymax]

    //  this.tileLayer.getMap()
    this.downloadTiles()
  }
  async downloadTiles() {
    // 当前绝对路径
    const downloadPath = this.rootPath + '\\'
    // 下载范围
    const zmin = this.minZoom
    const zmax = this.maxZoom + 1
    const pictureType = '.' + this.imageType
    // 遍历下载
    const option = {
      downloadPath,
      pictureType,
      imageType: this.imageType
    }

    for (let z = zmin; z < zmax; z++) {
      const urls = getGaodeTileUrls(this.tileLayer, this.extent, z)
      console.log(urls)

      for (const item of urls) {
        downloadImage(item, option)
      }
    }
  }
}

/**
 * 下载TMS瓦片集合
 */
export class TileTMSList {
  rootPath: string
  maxZoom: number
  minZoom: number
  extent: number[]
  imageType: string
  tileLayer: Array<MaptalksType.TileLayer>

  constructor(data: saveParam) {
    this.rootPath = data.savePath // 文件根目录
    this.maxZoom = data.maxZoom
    this.minZoom = data.minZoom
    this.imageType = data.imageType
    this.tileLayer = data.mapConfig.tileLayer as Array<MaptalksType.TileLayer>
    this.extent = [data.extent.xmin, data.extent.ymin, data.extent.xmax, data.extent.ymax]

    this.downloadLayers()
  }
  async downloadLayers() {
    for (let index = 0; index < this.tileLayer.length; index++) {
      const layer = this.tileLayer[index]
      await this.downloadTiles(layer)
    }

    // window.$message.success('瓦片数据下载完成。')
  }
  async downloadTiles(tileLayer) {
    // 当前绝对路径
    const downloadPath = this.rootPath + '\\' + tileLayer.config().style + '\\'
    // 下载范围
    const zmin = this.minZoom
    const zmax = this.maxZoom + 1
    const pictureType = '.' + this.imageType
    // 遍历下载
    const option = {
      downloadPath,
      pictureType,
      imageType: this.imageType
    }

    for (let z = zmin; z < zmax; z++) {
      const urls = getGaodeTileUrls(tileLayer, this.extent, z)
      console.log(urls)

      for (const item of urls) {
        downloadImage(item, option)
      }
      // await tileLayer.downloadCascadeTiles(z, option)
    }
    return Promise.resolve()
  }
}
