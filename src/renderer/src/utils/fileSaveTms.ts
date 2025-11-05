// import { useMessage } from 'naive-ui'

import type * as MaptalksType from 'maptalks/src/index.ts'
import type { saveParam } from '../components/types'
import { downloadImage } from './download'
import { TileGenerator, BaiduTileGenerator } from './genUrl'
/**
 * 下载TMS瓦片
 */
// export class TileTMS {
//   rootPath: string
//   maxZoom: number
//   minZoom: number
//   imageType: string
//   extent: number[]
//   tileLayer: MaptalksType.TileLayer

//   constructor(data: saveParam) {
//     this.rootPath = data.savePath // 文件根目录
//     this.maxZoom = data.maxZoom
//     this.minZoom = data.minZoom
//     this.imageType = data.imageType
//     this.tileLayer = data.mapConfig.tileLayer as MaptalksType.TileLayer
//     this.extent = [data.extent.xmin, data.extent.ymin, data.extent.xmax, data.extent.ymax]

//     //  this.tileLayer.getMap()
//     this.downloadTiles()
//   }
//   async downloadTiles() {
//     //
//     const mapStyle = this.tileLayer._id

//     // 当前绝对路径
//     const downloadPath = this.rootPath + '\\' + mapStyle + '\\'
//     // 下载范围
//     const zmin = this.minZoom
//     const zmax = this.maxZoom + 1
//     const pictureType = '.' + this.imageType
//     // 遍历下载
//     const option = {
//       downloadPath,
//       pictureType,
//       imageType: this.imageType
//     }

//     for (let z = zmin; z < zmax; z++) {
//       const urls = getGaodeTileUrls(this.tileLayer, this.extent, z)
//       console.log(urls)

//       for (const item of urls) {
//         downloadImage(item, option)
//       }
//     }
//   }
// }

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
  isBaidu: boolean

  constructor(data: saveParam) {
    this.rootPath = data.savePath // 文件根目录
    this.maxZoom = data.maxZoom
    this.minZoom = data.minZoom
    this.imageType = data.imageType
    this.tileLayer = data.mapConfig.tileLayer as Array<MaptalksType.TileLayer>
    this.extent = [data.extent.xmin, data.extent.ymin, data.extent.xmax, data.extent.ymax]
    const projection = data.mapConfig.projection.code
    if (projection === 'BAIDU') {
      this.isBaidu = true
    } else {
      this.isBaidu = false
    }

    this.downloadLayers()
  }
  async downloadLayers() {
    for (let index = 0; index < this.tileLayer.length; index++) {
      const layer = this.tileLayer[index]
      await this.downloadTiles(layer)
    }

    // window.$message.success('瓦片数据下载完成。')
  }
  async downloadTiles(tileLayer: MaptalksType.TileLayer) {
    // 当前绝对路径
    const downloadPath = this.rootPath + '\\' + tileLayer._id + '\\'
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
      let urls: { z: number; x: number; y: number; url: string }[] = []

      if (this.isBaidu === false) {
        const tileGenerator = new TileGenerator(tileLayer)
        urls = tileGenerator.getTileUrls(this.extent, z)
      } else {
        const tileGenerator = new BaiduTileGenerator(tileLayer)
        urls = tileGenerator.getTileUrlsByBounds(this.extent, z)
      }

      console.log(urls)

      for (const item of urls) {
        downloadImage(item, option)
      }
      // await tileLayer.downloadCascadeTiles(z, option)
    }
    return Promise.resolve()
  }
}
