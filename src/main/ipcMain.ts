// 在主进程中
import { ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'node:path'
import fse from 'fs-extra'
import sharp from 'sharp'

import { DownloadBridge } from './downloadBridge'
import { requestTile } from '../download/fetchStream'
import { createAgents, randomUserAgent } from '../download/httpPool'
import { FileSink } from '../download/sink'
import type { DownloadJob } from '../shared/downloadTypes'
import type { saveImageArgs } from './type.d'

ipcMain.handle('show-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory']
  })
  return result
})

let bridge: DownloadBridge | null = null

export function ipcHandle(win: BrowserWindow): void {
  bridge = new DownloadBridge({
    onProgress: (progress) => {
      if (!win.isDestroyed()) win.webContents.send('download:progress', progress)
    },
    onLog: (level, message) => {
      if (level !== 'info') console.log(`[download:${level}]`, message)
    }
  })

  win.on('closed', () => {
    bridge?.dispose()
    bridge = null
  })
}

// 在模块顶层注册，避免窗口重建时重复注册 handler

// 一次性下发整个下载任务，URL 生成与下载都在下载子进程完成
ipcMain.handle('download:start', async (_event, job: DownloadJob) => {
  bridge?.start(job)
  return { ok: true }
})

ipcMain.on('download:pause', () => bridge?.pause())
ipcMain.on('download:resume', () => bridge?.resume())
ipcMain.on('download:stop', () => bridge?.stop())

// 兼容旧的单张瓦片保存（图层合并等场景仍可能使用）
ipcMain.on('save-image', (_event, args: saveImageArgs) => {
  void saveSingleImage(args).catch((error: unknown) => {
    console.log('保存失败', args.url, error)
  })
})

// ---------------- 旧的单图保存通道 ----------------

const legacyAgents = createAgents({ socketsPerHost: 8 })
const legacySink = new FileSink(4)

async function saveSingleImage(args: saveImageArgs): Promise<void> {
  await fse.ensureDir(path.dirname(args.savePath))

  if (args.imageBuffer) {
    const base64Data = args.imageBuffer.replace(/^data:image\/\w+;base64,/, '')
    const dataBuffer = Buffer.from(base64Data, 'base64')
    await sharp({ failOnError: false })
      .composite([{ input: dataBuffer, gravity: 'centre', blend: 'dest-in' }])
      .toFile(args.savePath)
    return
  }

  if (!args.url) return
  await requestTile(
    {
      url: args.url,
      agents: legacyAgents,
      timeoutMs: 20_000,
      headers: { 'User-Agent': randomUserAgent() }
    },
    (res) => legacySink.write(res, args.savePath)
  )
}
