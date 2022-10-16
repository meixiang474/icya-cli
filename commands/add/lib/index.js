"use strict";

const path = require("path");
const inquirer = require("inquirer");
const pathExists = require("path-exists");
const fse = require("fs-extra");
const glob = require("glob");
const ejs = require("ejs");
const userHome = require("user-home");
const Command = require("@icya-cli/command");
const log = require("@icya-cli/log");
const Package = require("@icya-cli/package");
const { sleep, spinnerStart } = require("@icya-cli/utils");

const PAGE_TEMPLATE = [
  {
    name: "Vue2首页模板",
    npmName: "@icya-cli/template-page-vue2",
    version: "1.0.0",
    targetPath: "src/views/Home",
  },
];

process.on("unhandledRejection", (e) => {});

class AddCommand extends Command {
  init() {
    // 获取 add 命令的初始化参数
  }
  async exec() {
    // 1. 获取页面安装路径
    this.dir = process.cwd();
    // 2. 选择页面模板
    this.pageTemplate = await this.getPageTemplate();
    // 3. 安装页面模板
    // 3.0 预检查 (目录重名问题)
    await this.prepare();
    // 3.1 下载页面模板到缓存目录
    await this.downloadTemplate();
    // 3.2 将页面模板拷贝至指定目录
    await this.installTemplate();
    // 4. 合并页面模板依赖
    // 5. 页面模板安装完成
  }

  async prepare() {
    // 生成最终拷贝路径
    this.targetPath = path.resolve(this.dir, this.pageTemplate.pageName);
    if (await pathExists(this.targetPath)) {
      throw new Error("页面文件夹已经存在");
    }
  }

  async installTemplate() {
    log.verbose("pageTemplate", this.pageTemplate);
    // 模板路径
    const templatePath = path.resolve(
      this.pageTemplatePackage.cacheFilePath,
      "template",
      this.pageTemplate.targetPath
    );
    // 目标路径
    const targetPath = this.targetPath;
    if (!(await pathExists(templatePath))) {
      throw new Error("页面模板不存在");
    }
    log.verbose("templatePath", templatePath);
    log.verbose("targetPath", targetPath);
    fse.ensureDirSync(templatePath);
    fse.ensureDirSync(targetPath);
    fse.copySync(templatePath, targetPath);
    await this.ejsRender({
      targetPath,
    });
  }

  async ejsRender(options) {
    const { targetPath } = options;
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: targetPath,
          nodir: true,
        },
        (err, files) => {
          log.verbose("files", files);
          if (err) {
            reject(err);
          } else {
            Promise.all(
              files.map((file) => {
                // 获取文件的真是路径
                const filePath = path.resolve(targetPath, file);
                return new Promise((resolve1, reject1) => {
                  // ejs文件渲染 重新拼接参数
                  ejs.renderFile(
                    filePath,
                    {
                      name: this.pageTemplate.pageName,
                    },
                    {},
                    (err, result) => {
                      if (err) {
                        reject1(err);
                      } else {
                        // 重新写入文件
                        fse.writeFileSync(filePath, result);
                        resolve1(result);
                      }
                    }
                  );
                });
              })
            )
              .then(resolve)
              .catch(reject);
          }
        }
      );
    });
  }

  async downloadTemplate() {
    // 缓存文件夹
    const targetPath = path.resolve(userHome, ".icya-cli", "template");
    // 缓存路径
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } = this.pageTemplate;
    // 构建Package对象
    const pageTemplatePackage = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    // 页面模板存在更新，不存在则下载
    if (!(await pageTemplatePackage.exists())) {
      const spinner = spinnerStart("正在下载页面模板...");
      await sleep();
      try {
        await pageTemplatePackage.install();
      } finally {
        spinner.stop(true);
        if (await pageTemplatePackage.exists()) {
          log.success("下载页面模板成功");
          this.pageTemplatePackage = pageTemplatePackage;
        }
      }
    } else {
      const spinner = spinnerStart("正在更新页面模板...");
      await sleep();
      try {
        await pageTemplatePackage.update();
      } finally {
        spinner.stop(true);
        if (await pageTemplatePackage.exists()) {
          log.success("更新页面模板成功");
          this.pageTemplatePackage = pageTemplatePackage;
        }
      }
    }
  }

  async getPageTemplate() {
    const { pageTemplate: pageTemplateName } = await inquirer.prompt({
      type: "list",
      name: "pageTemplate",
      message: "请选择页面模板",
      choices: this.createChoices(),
    });
    // 2.1 输入页面名称
    const pageTemplate = PAGE_TEMPLATE.find(
      (item) => item.npmName === pageTemplateName
    );
    if (!pageTemplate) {
      throw new Error("页面模板不存在");
    }
    const { pageName } = await inquirer.prompt({
      type: "input",
      name: "pageName",
      message: "请输入页面名称",
      default: "",
      validate: function (value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("请输入页面名称");
          return;
        }
        done(null, true);
      },
    });
    pageTemplate.pageName = pageName.trim();
    return pageTemplate;
  }

  createChoices() {
    return PAGE_TEMPLATE.map((item) => ({
      name: item.name,
      value: item.npmName,
    }));
  }
}

function add(argv) {
  log.verbose("argv", argv);
  return new AddCommand(argv);
}

module.exports = add;
module.exports.AddCommand = AddCommand;
