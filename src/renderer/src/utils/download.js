/**
 * 下载单张瓦片
 * @param {object} tile 瓦片参数
 * @param {number} tile.z 缩放级别
 * @param {number} tile.x 瓦片x坐标
 * @param {number} tile.y 瓦片y坐标
 * @param {string} tile.url 瓦片url
 *
 * @param {object} downloadOption
 * @param {string} downloadOption.downloadPath "G:\\MapDownload\\"
 * @param {string} downloadOption.imageType "png"
 * @param {string} downloadOption.pictureType ".png"
 * @returns Promise
 */
export function downloadImage(tile, downloadOption) {
  const savePath = `${downloadOption.downloadPath}${tile.z}\\${tile.x}\\${tile.y}${downloadOption.pictureType}`
  //  savePath示例：G:\\MapDownload\\18\\123456\\789012.png
  const param = { zoom: tile.z, url: tile.url, savePath, x: tile.x, y: tile.y }
  window.electron.ipcRenderer.send('save-image', param)
}

/**
 * 下载瓦片
 * @param {Array} list 瓦片列表
 * @param {Function} apiDownload 下载方法
 * @returns
 */
export function downloadLoop(list, apiDownload) {
  if (!Array.isArray(list) || typeof apiDownload !== 'function') return
  const length = list.length
  if (length === 0) return

  let index = 0
  const download = () => {
    if (index >= length) {
      return
    }
    const item = list[index]

    apiDownload(item)
    index++
  }
  download()
}
