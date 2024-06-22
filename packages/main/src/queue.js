export class QueueList {
  taskNum = 10;
  runTask = null;
  list = [];
  count = 0; //总数
  error = 0; //错误总数
  success = 0; //成功总数
  requestNum = 0;

  /**
   *
   * @param {*} taskNum 同时下载数
   */
  constructor(taskNum = 10) {
    this.taskNum = taskNum;
    this.run();
  }
  run() {
    if (this.list.length > 0 && this.runTask) {
      let task = this.getFirstTask();
      if (task) {
        this.runTask(task);
      }
      setImmediate(() => {
        this.run();
      }, 1);
    } else {
      setImmediate(() => {
        this.run();
      }, 1000);
    }
  }
  addTask(path) {
    this.list.push(path);
    this.count++;
  }
  getFirstTask() {
    if (this.list.length && this.requestNum < this.taskNum) {
      this.requestNum++;
      return this.list.shift();
    } else {
      return null;
    }
  }
  subRequestNum() {
    this.requestNum--;
  }
}
