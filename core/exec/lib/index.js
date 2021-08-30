"use strict";

const path = require("path");
const Package = require("@icya-cli/package");
const log = require("@icya-cli/log");

// 命令 -> 包 映射表
const SETTINGS = {
  init: "@icya-cli/init",
};

// 远程包的缓存文件夹
const CACHE_DIR = "dependencies";

async function exec() {
  // 获取用户传进来的targetPath
  let targetPath = process.env.CLI_TARGET_PATH;
  // 获取homePath, 默认为/user/xxx/.icya-cli
  const homePath = process.env.CLI_HOME_PATH;
  // 远程包的缓存路径
  let storeDir = "";
  // 命令包实例
  let pkg;
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);

  // 参数中的最后一个是Command对象
  const cmdObj = arguments[arguments.length - 1];
  // 获取命令名称，如 init
  const cmdName = cmdObj.name();
  // 从映射表中取到包名
  const packageName = SETTINGS[cmdName];
  const packageVersion = "latest";

  if (!targetPath) {
    // targetPath不存在，说明要使用远程的包，生成缓存路径
    // 执行npminstall的目录 /usr/xxx/.icya-cli/dependencies
    targetPath = path.resolve(homePath, CACHE_DIR);
    // 缓存远程包所在的目录 /usr/xxx/.icya-cli/dependencies/node_modules
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);
    // 根据targetPath, homePath等信息创建Package实例
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
    if (await pkg.exists()) {
      // 更新远程包
      console.log("test");
    } else {
      // 安装远程包
      await pkg.install();
    }
  } else {
    // targetPath存在，使用本地命令包
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });
  }
  // 命令包入口文件
  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    // 执行对应命令包
    require(rootFile).apply(null, arguments);
  }
}

module.exports = exec;
