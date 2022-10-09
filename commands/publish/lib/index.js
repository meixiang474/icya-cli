"use strict";

const path = require("path");
const fs = require("fs");
const fse = require("fs-extra");
const Command = require("@icya-cli/command");
const log = require("@icya-cli/log");
const Git = require("@icya-cli/git");

class PublishCommand extends Command {
  init() {
    // 处理参数
    log.verbose("init", this._argv);
    this.options = {
      // 是否强制更新远程仓库类型
      refreshServer: this._cmd.refreshServer,
      // 是否强制更新远程仓库Token
      refreshToken: this._cmd.refreshToken,
    };
  }
  async exec() {
    try {
      // 开始时间
      const startTime = new Date().getTime();

      // 1. 初始化检查
      this.prepare();

      // 2. Git Flow自动化
      // 初始化git实例
      const git = new Git(this.projectInfo, this.options);
      // 代码仓库初始化和自动化提交准备工作
      await git.prepare();

      // 3. 云构建和云发布
      // 结束时间
      const endTime = new Date().getTime();
      log.info("本次发布耗时", Math.floor((endTime - startTime) / 1000) + "秒");
    } catch (e) {
      log.error(e.message);
      // debug 模式展示完整 error stack信息
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e);
      }
    }
  }

  // 准备工作，初始化检查
  prepare() {
    // 1. 确认项目是否为npm项目
    const projectPath = process.cwd();
    const pkgPath = path.resolve(projectPath, "package.json");
    log.verbose("package.json", pkgPath);
    if (!fs.existsSync(pkgPath)) {
      throw new Error("package.json不存在！");
    }
    // 2. 确认是否包含build命令 name, version等信息
    const pkg = fse.readJsonSync(pkgPath);
    const { name, version, scripts } = pkg;
    log.verbose("package.json", name, version, scripts);
    if (!name || !version || !scripts || !scripts.build) {
      throw new Error(
        "package.json信息不全，请检查是否存在name、version和scripts是否存在（scripts需要提供build命令）"
      );
    }
    // 检查通过则创建projectInfo
    this.projectInfo = {
      name,
      version,
      dir: projectPath,
    };
  }
}

function init(argv) {
  // 执行 publish命令
  return new PublishCommand(argv);
}

module.exports = init;
module.exports.PublishCommand = PublishCommand;
