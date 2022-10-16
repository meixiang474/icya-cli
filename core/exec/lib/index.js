"use strict";

const path = require("path");
const Package = require("@icya-cli/package");
const log = require("@icya-cli/log");
const { exec: spawn } = require("@icya-cli/utils");

// 命令 -> 包 映射表
const SETTINGS = {
  init: "@icya-cli/init",
  publish: "@icya-cli/publish",
  add: "@icya-cli/add",
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
      await pkg.update();
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
  const rootFile = pkg.getRootFilePath({
    targetPath,
    storeDir,
    packageName,
    packageVersion,
  });

  if (rootFile) {
    // exec是在一个新的promise中执行，cli的外层捕获不到异常
    try {
      // 执行对应命令包
      // require(rootFile)(Array.from(arguments));

      // 简化 cmdObj, 去掉原型属性和内置属性和parent
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null);
      Object.keys(cmd).forEach((key) => {
        if (
          cmd.hasOwnProperty(key) &&
          !key.startsWith("_") &&
          key !== "parent"
        ) {
          o[key] = cmd[key];
        }
      });
      args[args.length - 1] = o;

      // 拼接执行代码
      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;

      // 启用子进程执行命令包
      const child = spawn("node", ["-e", code], {
        // 指定工作目录为当前命令执行目录
        cwd: process.cwd(),
        // 将子进程的消息显示在父进程上
        stdio: "inherit",
      });
      // 命令执行失败监听
      child.on("error", (e) => {
        log.error(e.message);
        process.exit(1);
      });
      // 命令执行成功
      child.on("exit", (e) => {
        log.verbose("命令执行成功：" + e);
        process.exit(e);
      });
    } catch (e) {
      log.error(e.message);
    }
  }
}

// 兼容 windows 执行命令

module.exports = exec;
