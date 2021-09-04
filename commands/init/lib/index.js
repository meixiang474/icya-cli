"use strict";

const Command = require("@icya-cli/command");
const inquirer = require("inquirer");
const log = require("@icya-cli/log");
const fs = require("fs");
const ejs = require("ejs");
const glob = require("glob");
const fse = require("fs-extra");
const semver = require("semver");
const path = require("path");
const Package = require("@icya-cli/package");
const { spinnerStart, sleep, execAsync } = require("@icya-cli/utils");

const getProjectTemplate = require("./getProjectTemplate");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";

// 命令白名单
const WHITE_COMMAND = ["npm", "cnpm"];

// 所有命令都继承Command基类
class InitCommand extends Command {
  init() {
    // 取出projectName
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }
  async exec() {
    // exec可以自己捕获错误进行处理
    try {
      // 1. 准备阶段, 获取用户输入的projectInfo
      const projectInfo = await this.prepare();
      log.verbose("projectInfo", projectInfo);
      if (projectInfo) {
        // 保存projectInfo
        this.projectInfo = projectInfo;

        // 2. 下载模版
        await this.downloadTemplate();
        // 3. 安装模版
        await this.installTemplate();
      }
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e);
      }
    }
  }

  // 安装模版
  async installTemplate() {
    // 如果模版信息不存在，则直接抛出异常
    if (this.templateInfo) {
      log.verbose("templateInfo", this.templateInfo);
      // 默认 type = normal
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate();
      } else {
        throw new Error("");
      }
    } else {
      throw new Error("项目模版信息不存在！");
    }
  }

  // 检测命令是否符合白名单
  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  // 执行命令
  async execCommand(command, errMsg) {
    // 命令执行前需要过一遍白名单，防止用户配置的命令是rm -rf /之类
    let res;
    const cmdArray = command.split(" ");
    const cmd = this.checkCommand(cmdArray[0]);
    if (!cmd) {
      throw new Error("无法识别安装命令：" + command);
    }
    const args = cmdArray.slice(1);
    res = await execAsync(cmd, args, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    if (res !== 0) {
      throw new Error(errMsg);
    }
    return res;
  }

  // ejs模版渲染
  async ejsRender(options) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {
      // 遍历当前整个目录
      glob(
        "**",
        {
          cwd: dir,
          ignore: options.ignore,
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject(err);
          }
          // files: [src/App.vue]
          // 对所有文件进行ejs渲染
          Promise.all(
            files.map((file) => {
              // 每个文件的绝对路径
              const filePath = path.join(dir, file);
              return new Promise((resolve1, reject1) => {
                ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                  if (err) {
                    reject1(err);
                  } else {
                    // 将渲染结果写入
                    fse.writeFileSync(filePath, result);
                    resolve1(result);
                  }
                });
              });
            })
          )
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        }
      );
    });
  }

  // 安装标准模版
  async installNormalTemplate() {
    log.verbose("templateNpm", this.templateNpm);
    // 拷贝模版代码至当前目录
    // 模版存在的目录
    const templatePath = path.resolve(
      this.templateNpm.cacheFilePath,
      "template"
    );
    // 当前目录
    const targetPath = process.cwd();
    const spinner = spinnerStart("正在安装模版...");
    await sleep();
    try {
      // 确保两个目录在使用前都是存在的
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      return Promise.reject(e);
    } finally {
      spinner.stop(true);
      log.success("模版安装成功");
    }

    // ejs模版渲染
    // ejs忽略的文件夹
    const ignore = ["node_modules/**", "public/**"];
    await this.ejsRender({ ignore });

    const { installCommand, startCommand } = this.templateInfo;

    // 依赖安装
    // npm install
    if (installCommand) {
      await this.execCommand(installCommand, "依赖安装过程中失败！");
    }

    // 启动项目
    if (startCommand) {
      await this.execCommand(startCommand, "项目启动失败！");
    }
  }

  // 安装自定义模版
  async installCustomTemplate() {}

  // 下载模版
  async downloadTemplate() {
    // 找到用户选择的 template 信息
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(
      (item) => item.npmName === projectTemplate
    );
    // 保存用户选择的 templateInfo
    this.templateInfo = templateInfo;
    // 取出当前脚手架的 home path 如 /usr/xxx/.icya-cli/templates
    const targetPath = path.resolve(process.env.CLI_HOME_PATH, "templates");
    // 模版存储路径
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } = templateInfo;
    // 每个模版都是一个 npm 包
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    // 如果本地没有缓存模版, 直接安装，否则更新
    if (!(await templateNpm.exists())) {
      // 让 spinner开始转
      const spinner = spinnerStart("正在下载模版...");
      // 延迟1s 让效果明显一些
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        return Promise.reject(e);
      } finally {
        // 结束spinner
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("下载模版成功！");
          // 保存 Package 实例
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart("正在更新模版...");
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        return Promise.reject(e);
      } finally {
        // 结束spinner
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("更新模版成功！");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  // 准备阶段
  async prepare() {
    // 0. 判断项目模版是否存在，模版不存在或者为空数组直接抛出异常
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("项目模版不存在");
    }
    // 保存模版信息
    this.template = template;

    // 1. 判断当前目录是否为空
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      // 用户传入--force 则不需要问询
      if (!this.force) {
        // 1.1 询问是否继续创建
        ifContinue = await inquirer.prompt({
          type: "confirm",
          name: "ifContinue",
          default: false,
          message: "当前文件夹不为空，是否继续创建项目",
        }).ifContinue;

        // 不继续创建流程直接终止
        if (!ifContinue) return;
      }

      // 2. 是否删除目录中的内容
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录下的文件",
        });
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }

  // 获取项目信息
  async getProjectInfo() {
    const isValidName = (v) => {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(
        v
      );
    };

    let projectInfo = {};
    let isProjectNameValid = false;
    // 验证用户自己 init 传入的项目名称是否合法
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    // 1. 选择创建项目还是组件
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    log.verbose("type", type);
    if (type === TYPE_PROJECT) {
      // 2. 获取项目的基本信息
      const projectNamePrompt = {
        type: "input",
        name: "projectName",
        message: "请输入项目名称",
        default: "",
        validate(v) {
          // 1. 输入首字符必须为英文字符
          // 2. 尾字符必须为英文或数字
          // 3.字符仅允许 - _
          // a-b a1-b1 a1-b1_c1
          const done = this.async();
          setTimeout(() => {
            if (!isValidName(v)) {
              done("请输入合法的项目名称！");
            }
            done(null, true);
          }, 0);
        },
        filter(v) {
          return v;
        },
      };
      const projectPrompt = [
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate(v) {
            const done = this.async();
            setTimeout(() => {
              if (!semver.valid(v)) {
                done("请输入合法的项目名称！");
              }
              done(null, true);
            }, 0);
          },
          filter(v) {
            // semver不合法时会返回null, 所以先做一次判断
            if (semver.valid(v)) {
              return semver.valid(v);
            } else {
              return v;
            }
          },
        },
        {
          type: "list",
          name: "projectTemplate",
          message: "请选择项目模版",
          choices: this.createTemplateChoice(),
        },
      ];
      // 如果 init 的是不合法名称才需要选择名称
      if (!isProjectNameValid) {
        projectPrompt.unshift(projectNamePrompt);
      }
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {
    }

    // 生成项目名称 className AbcAbc -> abc-abc
    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    // 添加version字段，适配模版
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }
    return projectInfo;
  }

  //  创建模版选择项
  createTemplateChoice() {
    return this.template.map((item) => ({
      value: item.npmName,
      name: item.name,
    }));
  }

  // 判断工作目录是否为空
  isDirEmpty(path) {
    let fileList = fs.readdirSync(path);
    // 去掉 node_modules 和 隐藏文件
    fileList = fileList.filter((file) => {
      return !file.startsWith(".") && ["node_modules"].indexOf(file) < 0;
    });
    return !fileList || fileList.length <= 0;
  }
}

// 入口文件
function init(argv) {
  // argv是一个数组
  return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
