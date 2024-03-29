"use strict";

const fs = require("fs");

// 判断是否是对象类型
function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

function spinnerStart(msg, spinnerString = "|/-\\") {
  const Spinner = require("cli-spinner").Spinner;
  const spinner = new Spinner(msg + " %s");
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function sleep(ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function exec(command, args, options) {
  // 判断平台是否是 windows
  const win32 = process.platform === "win32";
  // windows 只能用cmd执行命令
  const cmd = win32 ? "cmd" : command;
  // windows 的参数必须有/c
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;

  return require("child_process").spawn(cmd, cmdArgs, options || {});
}

function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on("error", (e) => {
      reject(e);
      process.exit(1);
    });
    p.on("exit", (c) => {
      resolve(c);
    });
  });
}

// 读取文件返回文件内容
function readFile(path, options = {}) {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    if (buffer) {
      if (options.toJson) {
        return buffer.toJSON();
      } else {
        return buffer.toString();
      }
    }
  }
  return null;
}

function writeFile(path, data, { rewrite = true } = {}) {
  if (fs.existsSync(path)) {
    // 是否覆盖文件
    if (rewrite) {
      fs.writeFileSync(path, data);
      return true;
    }
    return false;
  } else {
    fs.writeFileSync(path, data);
    return true;
  }
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
  exec,
  execAsync,
  readFile,
  writeFile,
};
