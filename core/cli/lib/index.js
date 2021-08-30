"use strict";

module.exports = core;

const path = require("path");
const colors = require("colors/safe");
const semver = require("semver");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const log = require("@icya-cli/log");

const constant = require("./const");
const pkg = require("../package.json");

// 参数对象 {debug: true}
let args;

// 入口函数
async function core() {
  try {
    // 检查脚手架版本号
    checkPkgVersion();
    // 检查node版本号
    checkNodeVersion();
    // 检查root账户
    checkRoot();
    // 检查本机用户主目录
    checkUserHome();
    // 检查入参
    checkInputArgs();
    // 初始化环境变量
    checkEnv();
    // 检查脚手架更新
    await checkGlobalUpdate();
  } catch (e) {
    // 只打印message,不打印stack
    log.error(e.message);
  }
}

// 检查脚手架更新
async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2. 调用npm api获取最新版本号
  const { getNpmSemverVersion } = require("@icya-cli/get-npm-info");
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(
        `请手动更新 ${npmName}, 当前版本：${currentVersion}，最新版本：${lastVersion}
          更新命令：npm install -g ${npmName}`
      )
    );
  }
}
// 初始化环境变量
function checkEnv() {
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  // 如果用户主目录下存在.env
  if (pathExists(dotenvPath)) {
    // 读取用户主目录下的.env文件
    dotenv.config({
      path: dotenvPath,
    });
  }
  // 创建默认环境变量
  createDefaultConfig();
  // 默认{cliHome: /user/xxx/.icya-cli}
  log.verbose("环境变量", "CLI_HOME_PATH", process.env.CLI_HOME_PATH);
}

// 创建默认环境变量
function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig.cliHome = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig.cliHome = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// 检查入参
function checkInputArgs() {
  const minimist = require("minimist");
  // 获取参数  {debug: true}
  args = minimist(process.argv.slice(2));
  // 校验参数
  checkArgs();
}

function checkArgs() {
  // 检查是否是debug模式
  if (args.debug || args.d) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }
  // 后置修改log level
  log.level = process.env.LOG_LEVEL;
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
