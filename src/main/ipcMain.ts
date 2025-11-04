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
    return
  }
  const dir = path.dirname(file)
  fse.ensureDirSync(dir)
  lastDirName = dir
}

// 下载事件
export function ipcHandle(win: BrowserWindow) {
  const queueList = new QueueList(20, function (args: saveImageArgs) {
    createDir(args.savePath)

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
        queueList.success++
        queueList.subRequestNum()
        win.webContents.send('imageDownloadDone', {
          count: queueList.count, //总数
          error: queueList.error, //错误总数
          success: queueList.success //成功总数
        })
      }).catch(() => {
        queueList.error++
        queueList.subRequestNum()
      })
    } else {
      new Promise((resolve, reject) => {
        requestHandle(request.get(args.url)).end(function (err, res) {
          if (err) {
            reject(err)
          }
          if (res) {
            fs.writeFile(args.savePath, Buffer.from(res.body), (err) => {
              if (err) {
                reject(err)
              } else {
                resolve(res)
              }
            })
          }
        })
      })
        .then(() => {
          queueList.success++
          queueList.subRequestNum()
          win.webContents.send('imageDownloadDone', {
            count: queueList.count, //总数
            error: queueList.error, //错误总数
            success: queueList.success, //成功总数
            requestNum: queueList.requestNum
          })
        })
        .catch(() => {
          queueList.subRequestNum()

          if (args.retry > 0) {
            console.log('加入重试', args.url)
            args.retry = args.retry - 1
            queueList.list.push(args)
          } else {
            console.log('下载失败', args.url)
            queueList.error++
            win.webContents.send('imageDownloadDone', {
              count: queueList.count, //总数
              error: queueList.error, //错误总数
              success: queueList.success, //成功总数
              requestNum: queueList.requestNum
            })
          }
        })
    }
  })

  // superagent & sharp 下载图片
  ipcMain.on('save-image', (event, args: saveImageArgs) => {
    if (queueList.count === queueList.success + queueList.error) {
      // 任务完成后，新任务清理统计
      queueList.count = 0
      queueList.error = 0
      queueList.success = 0
      queueList.requestNum = 0
    }
    queueList.addTask({
      ...args,
      retry: 5
    })
  })
}
