// 在主进程中.
const { ipcMain } = require("electron");
const { dialog } = require("electron");
const fse = require("fs-extra");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const request = require("superagent");

import { requestHandle } from "./ipHandle";
import { QueueList } from "./queue";
ipcMain.handle("show-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "openDirectory"],
  });
  return result;
});
// 确保目录存在，不存在则创建
ipcMain.on("ensure-dir", (event, args) => {
  createDir(args);
});
function createDir(file) {
  const dir = path.dirname(file);
  fse.ensureDirSync(dir);
}

// 下载事件
export function ipcHandle(win) {
  let queueList = new QueueList(20);
  queueList.runTask = function (args) {
    createDir(args.savePath);

    const promises = [];
    if (args.imageBuffer) {
      const base64Data = args.imageBuffer.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const dataBuffer = Buffer.from(base64Data, "base64");
      const sharpStream = sharp({
        failOnError: false,
      });
      promises.push(
        sharpStream
          .composite([
            { input: dataBuffer, gravity: "centre", blend: "dest-in" },
          ])
          .toFile(args.savePath)
      );
    } else {
      let req = new Promise((resolve, reject) => {
        requestHandle(request.get(args.url)).end(function (err, res) {
          if (err) {
            reject(err);
          }
          if (res) {
            fs.writeFile(args.savePath, Buffer.from(res.body), (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(res);
              }
            });
          }
        });
      });
      promises.push(req);
    }

    Promise.all(promises)
      .then(() => {
        queueList.success++;
        queueList.subRequestNum();
        win.webContents.send("imageDownloadDone", {
          count: queueList.count, //总数
          error: queueList.error, //错误总数
          success: queueList.success, //成功总数
        });
      })
      .catch(() => {
        queueList.subRequestNum();

        if (!args.retry || args.retry < 5) {
          console.log("加入重试", args.url);
          args.retry = !args.retry ? 1 : args.retry + 1;
          queueList.list.push(args);
          queueList.taskNum = 6;
        } else {
          console.log("下载失败", args.url);
          queueList.error++;

          // try {
          //   fs.unlinkSync(args.savePath);
          // } catch (e) {
          //   console.error(e);
          // }
          win.webContents.send("imageDownloadDone", {
            count: queueList.count, //总数
            error: queueList.error, //错误总数
            success: queueList.success, //成功总数
          });
        }
      });
  };
  // superagent & sharp 下载图片
  ipcMain.on("save-image", (event, args) => {
    // console.log(args);
    queueList.addTask(args);
  });
}
