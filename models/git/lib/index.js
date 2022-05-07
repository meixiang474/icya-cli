"use strict";

const path = require("path");
const fs = require("fs");
const SimpleGit = require("simple-git");
const userHome = require("user-home");
const inquirer = require("inquirer");
const log = require("@icya-cli/log");
const fse = require("fs-extra");
const { readFile } = require("@icya-cli/utils");

const DEFAULT_CLI_HOME = ".icya-cli";
const GIT_ROOT_DIR = ".git";
const GIT_SERVER_FILE = ".git_server";
const GITHUB = "GITHUB";
const GITEE = "GITEE";

const GIT_SERVER_TYPE = [
  {
    name: "Github",
    value: GITHUB,
  },
  {
    name: "Gitee",
    value: GITEE,
  },
];

class Git {
  constructor({ name, version, dir }) {
    this.name = name;
    this.version = version;
    // 项目根目录
    this.dir = dir;
    // 让simple-git接管项目
    this.git = SimpleGit(dir);
    // GitServer实例
    this.gitServer = null;
    this.homePath = null;
  }

  prepare() {
    // 检查缓存主目录
    this.checkHomePath();
    // 检查用户远程仓库类型，gitee github
    this.checkGitServer();
  }

  // 检查缓存主目录
  checkHomePath() {
    if (!this.homePath) {
      // 获取icya-cli缓存主目录
      if (process.env.CLI_HOME_PATH) {
        // ~/.icya-cli
        this.homePath = process.env.CLI_HOME_PATH;
      } else {
        this.homePath = path.resolve(userHome, DEFAULT_CLI_HOME);
      }
    }
    // ~/.icya-cli
    log.verbose("home", this.homePath);
    // 确保缓存主目录可用
    fse.ensureDirSync(this.homePath);
    if (!fs.existsSync(this.homePath)) {
      throw new Error("用户主目录获取失败");
    }
  }

  // 检查用户远程仓库类型，gitee github
  async checkGitServer() {
    // ~/.icya-cli/.git/.git_server
    const gitServerPath = this.createPath(GIT_SERVER_FILE);
    // 读取.git_server文件内容
    let gitServer = readFile(gitServerPath);
    if (!gitServer) {
      gitServer = await inquirer.prompt({
        type: "list",
        name: "type",
        message: "请选择初始化类型",
        default: GITHUB,
        choices: GIT_SERVER_TYPE,
      });
    }
  }

  createPath(file) {
    // ~/.icya-cli/.git
    const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR);
    const filePath = path.resolve(rootDir, file);
    fse.ensureDirSync(rootDir);
    return filePath;
  }

  init() {
    console.log("init");
  }
}

module.exports = Git;
