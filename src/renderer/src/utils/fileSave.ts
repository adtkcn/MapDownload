// 地图
import { TileTMSList } from './fileSaveTms'

import type { saveParam } from '../components/types'
export default class FileSave {
  constructor(data: saveParam) {
    console.log('下载配置', data)
    // const projection = data.mapConfig.projection.code // BAIDU,EPSG:4326,EPSG:3857

    new TileTMSList(data)
  }
}
