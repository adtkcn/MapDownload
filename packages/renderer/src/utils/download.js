// 下载

// eslint-disable-next-line
import { judgeTile } from "./baseMap";
import { ClipImage } from "./clipImage";
const CLIPIMAGE = new ClipImage();

/**
 * 下载单张瓦片
 * @param {*} tile 瓦片参数
 * @param {*} downloadOption 下载参数
 * @returns Promise
 */
export function downloadImage(tile, downloadOption) {
  const { clipImage } = downloadOption;
  if (clipImage) {
    return _downloadClipImage(tile, downloadOption);
  } else {
    return _downloadImage(tile, downloadOption);
  }
}

/**
 * 下载单张瓦片
 * @param {*} tile
 * @param {*} downloadOption
 * @returns
 */
function _downloadImage(tile, downloadOption) {
  const tempPath = downloadOption.downloadPath + tile.z + "\\" + tile.x;
  // window.electron.ipcRenderer.send('ensure-dir', tempPath);
  const savePath = tempPath + "\\" + tile.y + downloadOption.pictureType;
  const param = { zoom: tile.z, url: tile.url, savePath, x: tile.x, y: tile.y };

  window.electron.ipcRenderer.send("save-image", param);
}

/**
 * 下载单张瓦片并裁切
 * @param {*} tile
 * @param {*} downloadOption
 * @returns
 */
function _downloadClipImage(tile, downloadOption) {
  const { tileLayer, downloadGeometry, pictureType, downloadPath, imageType } =
    downloadOption;
  // 获取坐标投影信息
  const { width, height } = tileLayer.getTileSize();
  const spatialReference = tileLayer.getSpatialReference();
  const prj = spatialReference.getProjection();
  const fullExtent = spatialReference.getFullExtent();
  const code = prj.code;

  const apiDownload = (temp, imageBuffer) => {
    const tempPath = downloadPath + temp.z + "\\" + temp.x;
    // window.electron.ipcRenderer.send('ensure-dir', tempPath);
    const savePath = tempPath + "\\" + temp.y + pictureType;
    const param = {
      zoom: temp.z,
      url: temp.url,
      savePath,
      x: temp.x,
      y: temp.y,
      imageBuffer,
    };
    window.electron.ipcRenderer.send("save-image", param);
  };

  const item = tile;
  const relation = judgeTile(downloadGeometry, {
    width,
    height,
    spatialReference,
    prj,
    fullExtent,
    code,
    tile: { x: item.x, y: item.y, z: item.zoom || item.z },
  });
  if (relation === 1) {
    apiDownload(item);
  } else if (relation === 2) {
    return;
  } else if (typeof relation === "object") {
    // 裁切下载
    CLIPIMAGE.addTempGeometry(relation.intersection, relation.rect);
    CLIPIMAGE.getImage(imageType).then((imageBuffer) => {
      apiDownload(item, imageBuffer);
    });
  }
}

/**
 * 下载瓦片
 * @param {Array} list 瓦片列表
 * @param {Function} apiDownload 下载方法
 * @returns
 */
export function downloadLoop(list, apiDownload) {
  if (!Array.isArray(list) || typeof apiDownload !== "function") return;
  const length = list.length;
  if (length === 0) return;


  let index = 0;
  const download = () => {
    if (index >= length) {

      return;
    }
    const item = list[index];

    apiDownload(item);
    index++;
  };
  download();

}
