"use strict";

module.exports = core;

const path = require("path");
const colors = require("colors/safe");
const semver = require("semver");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const commander = require("commander");
const log = require("@icya-cli/log");
const exec = require("@icya-cli/exec");

const constant = require("./const");
const pkg = require("../package.json");

// 实例化脚手架对象
const program = new commander.Command();

// 入口函数
async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    // 只打印message,不打印stack
    log.error(e.message);
    // debug模式下打印完整错误
    if (program.debug) {
      console.log(e);
    }
  }
}

// 注册命令
function registerCommand() {
  // 配置program
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地文件路径", "");

  // 注册init命令, 命令使用exec模块来调度
  program
    .command("init [projectName]")
    .option("-f --force", "是否强制初始化项目", false)
    .action(exec);

  // 是否开启调试模式
  program.on("option:debug", () => {
    if (program.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    // 动态修改log level
    log.level = process.env.LOG_LEVEL;
  });

  // 监听targetPath, 将其挂在环境变量上
  program.on("option:targetPath", () => {
    process.env.CLI_TARGET_PATH = program.targetPath;
  });

  // 对未知命令进行监听
  program.on("command:*", (obj) => {
    // 取出注册命令名称
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red("未知命令：" + obj[0]));
    if (availableCommands.length > 0) {
      console.log(colors.red("可用命令：" + availableCommands.join(",")));
    }
  });

  // 解析参数
  program.parse(process.argv);

  // 如果用户没有输入命令,输出帮助文档
  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log();
  }
}

// 脚手架准备阶段
async function prepare() {
  // 检查脚手架版本号
  checkPkgVersion();
  // 检查root账户
  checkRoot();
  // 检查本机用户主目录
  checkUserHome();
  // 初始化环境变量
  checkEnv();
  // 检查脚手架更新
  await checkGlobalUpdate();
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
  // 默认{cliHome: /user/xxx/.icya-cli}
  createDefaultConfig();
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

// 检查脚手架版本号
function checkPkgVersion() {
  log.info("cli", pkg.version);
}
