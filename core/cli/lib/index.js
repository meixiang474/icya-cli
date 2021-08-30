"use strict";

module.exports = core;

const colors = require("colors/safe");
const semver = require("semver");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const log = require("@icya-cli/log");

const constant = require("./const");
const pkg = require("../package.json");

// 入口函数
function core() {
  try {
    // 检查脚手架版本号
    checkPkgVersion();
    // 检查node版本号
    checkNodeVersion();
    // 检查root账户
    checkRoot();
    // 检查本机用户主目录
    checkUserHome();
  } catch (e) {
    // 只打印message,不打印stack
    log.error(e.message);
  }
}

// 检查本机用户目录
function checkUserHome() {
  // 如果用户主目录不存在抛出异常
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户主目录不存在"));
  }
}

// 检查root账户，并降级
function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
}

// 检查node版本号
function checkNodeVersion() {
  // 获取当前node版本号
  const currentVersion = process.version;
  // 比对版本号, 如果不满足最低版本号则抛出异常
  const lowestVersion = constant.LOWEST_NODE_VERSION;
  if (!semver.gte(currentVersion, lowestVersion)) {
    throw new Error(colors.red(`icya-cli 需要安装 v${lowestVersion} Node.js`));
  }
}

// 检查脚手架版本号
function checkPkgVersion() {
  log.info("cli", pkg.version);
}
