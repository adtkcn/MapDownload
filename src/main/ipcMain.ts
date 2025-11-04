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
        win.webContents.send('imageDownloadDone', {
          count: queueList.count, //总数
          error: queueList.error, //错误总数
          success: queueList.success //成功总数
        })
      }).catch(() => {
        queueList.err()
      })
    } else {
      new Promise((resolve, reject) => {
        // 检查本地是否存在文件
        if (fs.existsSync(args.savePath)) {
          // console.log('文件已存在免下载')
          queueList.exist()
          resolve(null)
          return
        }
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
          // queueList.success++
          queueList.ok()
          win.webContents.send('imageDownloadDone', {
            count: queueList.count, //总数
            error: queueList.error, //错误总数
            success: queueList.success, //成功总数
            existNum: queueList.existNum, //已存在文件数
            requestNum: queueList.requestNum
          })
        })
        .catch(() => {
          queueList.err()

          if (args.retry > 0) {
            console.log('加入重试', args.url)
            args.retry = args.retry - 1
            queueList.addTask(args)
          } else {
            console.log('下载失败', args.url)
          }
          win.webContents.send('imageDownloadDone', {
            count: queueList.count, //总数
            error: queueList.error, //错误总数
            success: queueList.success, //成功总数
            existNum: queueList.existNum, //已存在文件数
            requestNum: queueList.requestNum
          })
        })
    }
  })

  // superagent & sharp 下载图片
  ipcMain.on('save-image', (_event, args: saveImageArgs) => {
    if (queueList.count === queueList.success + queueList.error) {
      // 任务完成后，新任务清理统计
      queueList.reset()
    }
    queueList.addTask({
      ...args,
      retry: 5
    })
  })
}
