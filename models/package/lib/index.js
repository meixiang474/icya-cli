"use strict";

const path = require("path");
const pkgDir = require("pkg-dir").sync;
const { isObject } = require("@icya-cli/utils");
const formatPath = require("@icya-cli/format-path");
const npminstall = require("npminstall");
const { getDefaultRegistry } = require("@icya-cli/get-npm-info");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类的options参数不能为空!");
    }
    if (!isObject(options)) {
      throw new Error("Package类的options参数必须为对象");
    }
    // 本地 package 的路径
    this.targetPath = options.targetPath;
    // 远程 package 的缓存路径
    this.storeDir = options.storeDir;
    // 远程 package 的name
    this.packageName = options.packageName;
    // 远程 package 的version
    this.packageVersion = options.packageVersion;
  }
  // 判断当前Package是否存在
  exists() {}

  // 安装Package
  install() {
    npminstall({
      // 执行目录
      root: this.targetPath,
      // 存锤目录
      storeDir: this.storeDir,
      // 默认是淘宝源
      registry: getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }

  // 更新Package
  update() {}

  // 获取入口文件路径
  getRootFilePath() {
    // 1. 获取package.json所在目录
    const dir = pkgDir(this.targetPath);
    if (dir) {
      // 2. 读取package.json
      const pkgFile = require(path.resolve(dir, "package.json"));
      // 3. 寻找main
      if (pkgFile && pkgFile.main) {
        // 4. resolve出入口文件路径， 并兼容windows
        return formatPath(path.resolve(dir, pkgFile.main));
      }
    }
    return null;
  }
}

module.exports = Package;
