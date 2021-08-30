"use strict";

module.exports = core;

const pkg = require("../package.json");
const log = require("@icya-cli/log");

// 入口函数
function core() {
  // 检查版本号
  checkPkgVersion();
}

// 检查版本号
function checkPkgVersion() {
  log.info("cli", pkg.version);
}
