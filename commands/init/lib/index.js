"use strict";

const Command = require("@icya-cli/command");
const log = require("@icya-cli/log");

// 所有命令都继承Command基类
class InitCommand extends Command {
  init() {
    // 取出projectName
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }
  exec() {
    console.log("exec");
  }
}

// 入口文件
function init(argv) {
  // argv是一个数组
  return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
