// 瓦片转换


/**
 * 下载TMS瓦片
 */
export class TileTMS {
  constructor(data) {
    this.rootPath = data.savePath; // 文件根目录
    this.maxZoom = data.maxZoom;
    this.minZoom = data.minZoom;
    this.imageType = data.imageType;
    this.tileLayer = data.mapConfig.tileLayer;
    this.downloadGeometry = data.downloadGeometry;
    this.downloadTiles(data.clipImage);
  }
  async downloadTiles(clipImage) {
    // 当前绝对路径
    const downloadPath = this.rootPath + '\\';
    // 下载范围
    const zmin = this.minZoom;
    const zmax = this.maxZoom + 1;
    const pictureType = '.' + this.imageType;
    // 遍历下载
    const option = {
      downloadPath,
      pictureType,
      imageType: this.imageType,
    };
    if (clipImage) {
      option.clipImage = clipImage;
      option.tileLayer = this.tileLayer;
      option.downloadGeometry = this.downloadGeometry;
    }


    for (let z = zmin; z < zmax; z++) {
      this.tileLayer.downloadCascadeTiles(z, option);
    }




    window.$message.success('瓦片数据下载中。。。');
  }
}

/**
 * 下载TMS瓦片集合
 */
export class TileTMSList {
  constructor(data) {
    this.rootPath = data.savePath; // 文件根目录
    this.maxZoom = data.maxZoom;
    this.minZoom = data.minZoom;
    this.imageType = data.imageType;
    this.tileLayer = data.mapConfig.tileLayer;
    this.downloadGeometry = data.downloadGeometry;

    this.downloadLayers(data);
  }
  async downloadLayers(data) {


    for (let index = 0; index < data.mapConfig.tileLayer.length; index++) {
      const layer = data.mapConfig.tileLayer[index];
      await this.downloadTiles(data.clipImage, layer, (index + 1) / (data.mapConfig.tileLayer.length) * 100);
    }


    window.$message.success('瓦片数据下载完成。');
  }
  async downloadTiles(clipImage, tileLayer, count) {
    // 当前绝对路径
    const downloadPath = this.rootPath + '\\' + tileLayer.config().style + '\\';
    // 下载范围
    const zmin = this.minZoom;
    const zmax = this.maxZoom + 1;
    const pictureType = '.' + this.imageType;
    // 遍历下载
    const option = {
      downloadPath,
      pictureType,
      imageType: this.imageType,
    };
    if (clipImage) {
      option.clipImage = clipImage;
      option.tileLayer = tileLayer;
      option.downloadGeometry = this.downloadGeometry;
    }
    for (let z = zmin; z < zmax; z++) {

      await tileLayer.downloadCascadeTiles(z, option);
    }
    return Promise.resolve();
  }
}
