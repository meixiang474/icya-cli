"use strict";

const path = require("path");
const fse = require("fs-extra");
const pkgDir = require("pkg-dir").sync;
const pathExists = require("path-exists").sync;
const { isObject } = require("@icya-cli/utils");
const formatPath = require("@icya-cli/format-path");
const npminstall = require("npminstall");
const {
  getDefaultRegistry,
  getNpmLatestVersion,
} = require("@icya-cli/get-npm-info");

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
    // 远程包的缓存前缀 如 @icya-cli_init
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  // 远程包前处理
  async prepare() {
    // 使用远程包，但是远程包缓存路径还未创建, 那么将缓存目录创建出来
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    // 将 latest 版本转换成具体的版本
    if (this.packageVersion === "latest") {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  // 远程包缓存下来自身的路径 如 /usr/xxx/.icya-cli/dependencies/node_modules/_@icya-cli_init@1.0.4@@icya-cli/init
  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  // 获取指定版本的远程包的缓存路径
  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }

  // 判断当前Package是否存在
  async exists() {
    // 使用远程命令包时
    if (this.storeDir) {
      // 远程包前处理
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      // 使用本地命令包时, 直接检测本地包路径是否存在
      return pathExists(this.targetPath);
    }
  }

  // 安装Package
  async install() {
    // 远程包前处理
    await this.prepare();
    return npminstall({
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
  async update() {
    await this.prepare();
    // 1. 获取最新的远程包版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 2. 查看最新的包是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3. 如果不存在安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        // 执行目录
        root: this.targetPath,
        // 存锤目录
        storeDir: this.storeDir,
        // 默认是淘宝源
        registry: getDefaultRegistry(),
        pkgs: [{ name: this.packageName, version: latestPackageVersion }],
      });
    }
    // 更新packageVersion到最新
    this.packageVersion = latestPackageVersion;
  }

  // 获取入口文件路径
  getRootFilePath() {
    const _getRootFile = (targetPath) => {
      // 1. 获取package.json所在目录
      const dir = pkgDir(targetPath);
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
    };

    if (this.storeDir) {
      // 使用远程缓存包的情况
      return _getRootFile(this.cacheFilePath);
    } else {
      // 执行本地命令包的情况
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
