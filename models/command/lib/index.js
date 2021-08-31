"use strict";

const semver = require("semver");
const colors = require("colors/safe");
const log = require("@icya-cli/log");

// 最低版本node
const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(argv) {
    // argv是一个参数数组 如[projectName, cmdObj]
    if (!argv) {
      throw new Error("Command 参数不能为空！");
    }
    if (!Array.isArray(argv)) {
      throw new Error("Command 参数必须为数组");
    }
    if (argv.length < 1) {
      throw new Error("Command 参数列表不能为空");
    }
    this._argv = argv;
    // 使用promise链，让初始化过程中的所有函数都一个一个的在微任务队列中运行，减少执行栈的压力
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      // 校验 node 版本
      chain = chain.then(() => this.checkNodeVersion());
      // 参数初始化
      chain = chain.then(() => this.initArgs());
      // 执行子类的init
      chain = chain.then(() => this.init());
      // 执行子类的exec
      chain = chain.then(() => this.exec());
      // 监听所有异常
      chain.catch((e) => {
        log.error(e.message);
      });
    });
  }

  // 参数初始化
  initArgs() {
    // 最后一个参数是 cammander 的 Command 对象
    // cmdObj
    this._cmd = this._argv[this._argv.length - 1];
    // 如 [projectName]
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  // 检查node版本号
  checkNodeVersion() {
    // 获取当前node版本号
    const currentVersion = process.version;
    // 比对版本号, 如果不满足最低版本号则抛出异常
    const lowestVersion = LOWEST_NODE_VERSION;
    if (!semver.gte(currentVersion, lowestVersion)) {
      throw new Error(
        colors.red(`icya-cli 需要安装 v${lowestVersion} Node.js`)
      );
    }
  }
  init() {
    throw new Error("init必须实现");
  }
  exec() {
    throw new Error("exec必须实现");
  }
}

module.exports = Command;
