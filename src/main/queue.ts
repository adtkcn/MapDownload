import { saveImageArgs } from './type'

export class QueueList {
  isRunning = false
  taskNum = 10
  runTask: (task: saveImageArgs) => void
  list: Array<saveImageArgs> = []
  count = 0 //总数
  error = 0 //错误总数
  success = 0 //成功总数
  existNum = 0 //已存在文件数
  retryNum = 0 //重试次数
  requestNum = 0

  /**
   *
   * @param {*} taskNum 同时下载数
   */
  constructor(taskNum = 10, runTask: (task: saveImageArgs) => void) {
    this.taskNum = taskNum
    this.runTask = runTask
    this.run()
  }
  run() {
    if (this.isRunning && this.list.length > 0) {
      const task = this.getFirstTask()
      if (task) {
        this.requestNum++
        this.runTask(task)
      }
      setImmediate(() => {
        this.run()
      })
    } else {
      setTimeout(() => {
        this.run()
      }, 1000)
    }
  }
  addTask(task: saveImageArgs) {
    this.list.push(task)
    this.count++
  }
  retryTask(task: saveImageArgs) {
    if (task.retry <= 0) {
      return
    }

    if (this.isRunning) {
      this.retryNum++
      task.retry = task.retry - 1
      this.requestNum--
      this.list.push(task)
    }
  }
  private getFirstTask() {
    if (this.list.length && this.requestNum < this.taskNum) {
      return this.list.shift()
    } else {
      return null
    }
  }
  ok() {
    if (this.isRunning) {
      this.requestNum--
      this.success++
    }
  }
  err() {
    if (this.isRunning) {
      this.requestNum--
      this.error++
    }
  }
  exist() {
    if (this.isRunning) {
      this.requestNum--
      this.existNum++
    }
  }
  reset() {
    this.count = 0 //总数
    this.error = 0 //错误总数
    this.success = 0 //成功总数
    this.existNum = 0 //已存在文件数
    this.requestNum = 0 //当前请求数
    this.retryNum = 0 //重试次数
  }
  stop() {
    this.list = []
    this.reset()
  }
  pause() {
    this.isRunning = false
  }
  continue() {
    if (!this.isRunning) {
      this.isRunning = true
    }
  }
  start() {
    if (!this.isRunning) {
      this.isRunning = true
    }
  }
}
