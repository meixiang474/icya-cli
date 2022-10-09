"use strict";

const path = require("path");
const fs = require("fs");
const SimpleGit = require("simple-git");
const userHome = require("user-home");
const inquirer = require("inquirer");
const terminalLink = require("terminal-link");
const log = require("@icya-cli/log");
const fse = require("fs-extra");
const { readFile, writeFile } = require("@icya-cli/utils");
const Github = require("./Github");
const Gitee = require("./Gitee");

const DEFAULT_CLI_HOME = ".icya-cli";
const GIT_ROOT_DIR = ".git";
const GIT_SERVER_FILE = ".git_server";
const GIT_TOKEN_FILE = ".git_token";
const GITHUB = "github";
const GITEE = "gitee";

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
  constructor(
    { name, version, dir },
    { refreshServer = false, refreshToken = false }
  ) {
    this.name = name;
    this.version = version;
    // 项目根目录
    this.dir = dir;
    // 让simple-git接管项目
    this.git = SimpleGit(dir);
    // GitServer实例
    this.gitServer = null;
    this.homePath = null;
    // 是否强制更新git仓库类型, github gitee
    this.refreshServer = refreshServer;
    // 是否强制更新git仓库Token
    this.refreshToken = refreshToken;
  }

  async prepare() {
    // 检查缓存主目录
    this.checkHomePath();
    // 检查用户远程仓库类型，gitee github
    await this.checkGitServer();
    // 获取用户远程仓库 token
    await this.checkGitToken();
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
    if (!gitServer || this.refreshServer) {
      // 没有.git_server文件则选择git仓库类型并写入 GITHUB / GITEE
      gitServer = (
        await inquirer.prompt({
          type: "list",
          name: "gitServer",
          message: "请选择您想要托管的Git平台",
          default: GITHUB,
          choices: GIT_SERVER_TYPE,
        })
      ).gitServer;
      writeFile(gitServerPath, gitServer);
      log.success("git server写入成功", `${gitServer} -> ${gitServerPath}`);
    } else {
      log.verbose("git server获取成功", gitServer);
    }
    // 创建GitServer实例
    this.gitServer = this.createGitServer(gitServer);
    if (!this.gitServer) {
      throw new Error("GitServer初始化失败！");
    }
  }

  // 获取并检查用户远程仓库 token
  async checkGitToken() {
    // token 缓存文件路径 ~/.icya-cli/.git/.git_token
    const tokenPath = this.createPath(GIT_TOKEN_FILE);
    let token = readFile(tokenPath);
    if (!token || this.refreshToken) {
      // token 如果不存在提示用户去创建token, token需要用户手动添加到token缓存文件中
      log.warn(
        this.gitServer.type + " token未生成",
        "请先生成" +
          this.gitServer.type +
          " token，" +
          terminalLink("链接", this.gitServer.getTokenHelpUrl())
      );
      // token生成 google github token 和 gitee token
      token = (
        await inquirer.prompt({
          type: "password",
          name: "token",
          message: "请将token复制到这里",
          default: "",
        })
      ).token;
      writeFile(tokenPath, token);
      log.verbose("token写入成功", tokenPath);
    } else {
      log.verbose("token获取成功", tokenPath);
    }
    this.token = token;
    // 将 token 保存到 getServer
    this.gitServer.setToken(token);
  }

  // 创建GitServer实例
  createGitServer(gitServer = "") {
    // trim 去掉空格、换行符等
    const _gitServer = gitServer.trim();
    // 创建 GitServer实例
    if (_gitServer === GITHUB) {
      return new Github();
    }
    if (_gitServer === GITEE) {
      return new Gitee();
    }
    return null;
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
