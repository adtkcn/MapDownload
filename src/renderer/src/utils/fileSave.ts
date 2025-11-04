// 地图
import { TileTMS, TileTMSList } from './fileSaveTms'
import TileBaidu from './fileSaveBaidu'
import type { saveParam } from '../components/types'
export default class FileSave {
  constructor(data: saveParam) {
    console.log('下载配置', data)
    const projection = data.mapConfig.projection.code // BAIDU,EPSG:4326,EPSG:3857

    if (projection === 'BAIDU') {
      this.downloadBaidu(data)
    } else {
      this.downloadTms(data)
    }
  }

  downloadTms(data: saveParam) {
    if (Array.isArray(data.mapConfig.tileLayer) && data.mapConfig.tileLayer.length > 1) {
      new TileTMSList(data)
    } else {
      new TileTMS(data)
    }
  }
  downloadBaidu(data: saveParam) {
    new TileBaidu(data)
  }
}
