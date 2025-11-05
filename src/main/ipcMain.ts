// 在主进程中.
import { ipcMain, BrowserWindow } from 'electron'
// import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { dialog } from 'electron'
import fse from 'fs-extra'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import request from 'superagent'

import { requestHandle } from './ipHandle'
import { QueueList } from './queue'
import { saveImageArgs } from './type.d'
ipcMain.handle('show-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  })
  return result
})

let lastDirName = ''
function createDir(file: string) {
  if (lastDirName === path.dirname(file)) {
    // console.log('免创建目录')

    return
  }
  const dir = path.dirname(file)
  fse.ensureDirSync(dir)
  lastDirName = dir
}

// 下载事件
export function ipcHandle(win: BrowserWindow) {
  const queueList = new QueueList(50, function (args: saveImageArgs) {
    createDir(args.savePath)
    // 检查本地是否存在文件
    if (fs.existsSync(args.savePath)) {
      queueList.exist()
      sendImageDownloadDone()
      return
    }
    if (args.imageBuffer) {
      const base64Data = args.imageBuffer.replace(/^data:image\/\w+;base64,/, '')
      const dataBuffer = Buffer.from(base64Data, 'base64')
      const sharpStream = sharp({
        failOnError: false
      })
      const s = sharpStream
        .composite([{ input: dataBuffer, gravity: 'centre', blend: 'dest-in' }])
        .toFile(args.savePath)
      s.then(() => {
        queueList.ok()
        sendImageDownloadDone()
      }).catch(() => {
        queueList.err()
        sendImageDownloadDone()
      })
    } else {
      new Promise((resolve, reject) => {
        requestHandle(request.get(args.url))
          .responseType('blob')
          .end(function (err, res) {
            if (err) {
              reject(err)
              return
            }
            if (res) {
              try {
                fs.writeFile(args.savePath, Buffer.from(res.body), (err) => {
                  if (err) {
                    reject(err)
                  } else {
                    resolve(res)
                  }
                })
              } catch (error) {
                console.log(error)

                reject(error)
              }
            }
          })
      })
        .then(() => {
          // queueList.success++
          queueList.ok()
          sendImageDownloadDone()
        })
        .catch(() => {
          if (args.retry > 0) {
            console.log('加入重试', args.url)
            queueList.retryTask(args)
          } else {
            queueList.err()
            console.log('下载失败', args.url)
          }
          sendImageDownloadDone()
        })
    }
  })

  function sendImageDownloadDone() {
    win.webContents.send('imageDownloadDone', {
      count: queueList.count, //总数
      error: queueList.error, //错误总数
      success: queueList.success, //成功总数
      existNum: queueList.existNum, //已存在文件数
      requestNum: queueList.requestNum
    })
  }
  // superagent & sharp 下载图片
  ipcMain.on('save-image', (_event, args: saveImageArgs) => {
    if (queueList.count === queueList.success + queueList.error + queueList.existNum) {
      // 任务完成后，新任务清理统计
      queueList.reset()
    }
    queueList.addTask({
      ...args,
      retry: 5
    })
    queueList.start()
  })
  // 监听停止
  ipcMain.on('stop-download', () => {
    queueList.stop()
    sendImageDownloadDone()
  })
  // 监听暂停
  ipcMain.on('pause-download', () => {
    queueList.pause()
  })
  // 监听继续
  ipcMain.on('continue-download', () => {
    queueList.continue()
  })
}
