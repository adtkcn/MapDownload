// 地图
import {TileTMS, TileTMSList} from './fileSaveTms';
import TileBaidu from './fileSaveBaidu';

export default class FileSave{
  constructor(data) {
    console.log('下载配置',data);
    const projection = data.mapConfig.projection.code; // BAIDU,EPSG:4326,EPSG:3857

    if (projection === 'BAIDU') {
      this.downloadBaidu(data);
    } else {
      this.downloadTms(data);
    }
  }
  // 保存单张图片
  saveImage(param) {
    // const param = {
    //   url: 'https://map.geoq.cn/MapServer/tile/9/207/421',
    //   savePath: '',
    // };
    window.electron.ipcRenderer.send('save-image', param);

  }

  downloadTms(data) {

    if (Array.isArray(data.mapConfig.tileLayer) && data.mapConfig.tileLayer.length > 1) {

        new TileTMSList(data, this.saveImage);

    } else {
      new TileTMS(data);
    }

  }
  downloadBaidu(data) {
    new TileBaidu(data, this.saveImage);
  }
}
