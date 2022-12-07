"use strict";

const path = require("path");
const inquirer = require("inquirer");
const pathExists = require("path-exists");
const { sync: pkgUpSync } = require("pkg-up");
const fse = require("fs-extra");
const glob = require("glob");
const ejs = require("ejs");
const semver = require("semver");
const userHome = require("user-home");
const Command = require("@icya-cli/command");
const log = require("@icya-cli/log");
const Package = require("@icya-cli/package");
const { sleep, spinnerStart, execAsync } = require("@icya-cli/utils");

const PAGE_TEMPLATE = [
  {
    name: "Vue2首页模板",
    npmName: "@icya-cli/template-page-vue2",
    version: "latest",
    targetPath: "src/views/Home",
    ignore: ["assets/**"],
  },
];

const SECTION_TEMPLATE = [
  {
    name: "Vue2代码片段",
    npmName: "@icya-cli/template-section-vue",
    version: "latest",
  },
];

const ADD_MODE_SECTION = "section";
const ADD_MODE_PAGE = "page";

process.on("unhandledRejection", (e) => {});

class AddCommand extends Command {
  init() {
    // 获取 add 命令的初始化参数
  }
  async exec() {
    // 1. 选择复用方式
    this.addMode = (await this.getAddMode()).addMode;
    if (this.addMode === ADD_MODE_SECTION) {
      // 安装代码片段
      await this.installSectionTemplate();
    } else {
      // 安装页面模板
      await this.installPageTemplate();
    }
  }

  async installSectionTemplate() {
    // 1. 获取片段安装路径
    this.dir = process.cwd();
    // 2. 选择代码片段模板
    this.sectionTemplate = await this.getTemplate(ADD_MODE_SECTION);
    // 3. 安装代码片段模板
    // 3.1 预检查 (目录重名问题)
    await this.prepare(ADD_MODE_SECTION);
    // 3.2 下载代码片段
    await this.downloadTemplate(ADD_MODE_SECTION);
    // 3.3 代码片断安装
    await this.installSection();
  }

  async installPageTemplate() {
    // 1. 获取页面安装路径
    this.dir = process.cwd();
    // 2. 选择页面模板
    this.pageTemplate = await this.getTemplate();
    // 3. 安装页面模板
    // 3.0 预检查 (目录重名问题)
    await this.prepare(ADD_MODE_PAGE);
    // 3.1 下载页面模板到缓存目录
    await this.downloadTemplate(ADD_MODE_PAGE);
    // 3.2 将页面模板拷贝至指定目录
    await this.installTemplate();
  }

  getAddMode() {
    return inquirer.prompt({
      type: "list",
      name: "addMode",
      message: "请选择代码添加模式",
      choices: [
        {
          name: "代码片段",
          value: ADD_MODE_SECTION,
        },
        {
          name: "页面模板",
          value: ADD_MODE_PAGE,
        },
      ],
    });
  }

  async prepare(addMode = ADD_MODE_PAGE) {
    // 生成最终拷贝路径
    if (addMode === ADD_MODE_PAGE) {
      this.targetPath = path.resolve(this.dir, this.pageTemplate.pageName);
    } else {
      this.targetPath = path.resolve(
        this.dir,
        "components",
        this.sectionTemplate.sectionName
      );
    }
    if (await pathExists(this.targetPath)) {
      throw new Error("页面文件夹已经存在");
    }
  }

  async installSection() {
    // 1. 需要用户插入的行数
    const { lineNumber } = await inquirer.prompt({
      type: "input",
      message: "请输入要插入的行数：",
      name: "lineNumber",
      validate(value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done("插入的行数不能为空");
          return;
        }
        if (
          parseFloat(value) < 0 ||
          Math.floor(parseFloat(value)) !== parseFloat(value)
        ) {
          done("请输入有效的行数");
          return;
        }
        done(null, true);
      },
    });
    console.log(lineNumber);
    // 2. 对源码文件进行分割
    // todo 3-2
  }

  async installTemplate() {
    log.info("正在安装页面模板...");
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
    // ejs模板渲染
    await this.ejsRender({
      targetPath,
    });
    // 合并模板的依赖
    await this.dependenciesMerge({ templatePath, targetPath });
    log.success("安装页面模板成功");
  }

  async ejsRender(options) {
    const { targetPath } = options;
    const { ignore } = this.pageTemplate;
    return new Promise((resolve, reject) => {
      glob(
        "**",
        {
          cwd: targetPath,
          nodir: true,
          ignore: ignore || "",
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
                      name: this.pageTemplate.pageName.toLocaleLowerCase(),
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

  async execCommand(command, cwd) {
    let res;
    if (command) {
      // npm install => [npm, install]
      const cmdArray = command.split(" ");
      const cmd = cmdArray[0];
      const args = cmdArray.slice(1);
      res = await execAsync(cmd, args, {
        stdio: "inherit",
        cwd,
      });
      // 感觉失败也不会走到这里来
      if (res !== 0) {
        throw new Error(command + "命令执行失败");
      }
      return res;
    }
  }

  async dependenciesMerge(options) {
    const objToArray = (o) => {
      const arr = [];
      Object.keys(o).forEach((key) => {
        arr.push({
          key,
          value: o[key],
        });
      });
      return arr;
    };
    const arrayToObj = (arr) => {
      const o = {};
      arr.forEach((item) => {
        o[item.key] = item.value;
      });
      return o;
    };
    const depDiff = (templateDepArr, targetDepArr) => {
      const finalDep = [...targetDepArr];
      // 1. 模板中存在依赖 但是项目中没有(拷贝依赖)
      // 2. 模板中存在依赖 项目中也存在(不会拷贝依赖，但是会在脚手架中提示)
      templateDepArr.forEach((templateDep) => {
        const duplicateDep = targetDepArr.find(
          (targetDep) => templateDep.key === targetDep.key
        );
        if (duplicateDep) {
          log.verbose("查询到重复依赖", duplicateDep);
          const templateRange = semver
            .validRange(templateDep.value)
            .split("<")[1];
          const targetRange = semver
            .validRange(duplicateDep.value)
            .split("<")[1];
          if (templateRange !== targetRange) {
            log.warn(
              `${templateDep.key}冲突，${templateDep.value} => ${duplicateDep.value}`
            );
          }
        } else {
          log.verbose("查询到新依赖", templateDep);
          finalDep.push(templateDep);
        }
      });
      return finalDep;
    };
    // 处理依赖合并问题
    // 1. 获取package.json
    const { templatePath, targetPath } = options;
    const templatePkgPath = pkgUpSync({ cwd: templatePath });
    const targetPkgPath = pkgUpSync({ cwd: targetPath });
    const templatePkg = fse.readJSONSync(templatePkgPath);
    const targetPkg = fse.readJSONSync(targetPkgPath);
    // 2. 获取dependencies
    const templateDependencies = templatePkg.dependencies || {};
    const targetDependencies = targetPkg.dependencies || {};
    // 3. 将对象转换成数组
    const templateDepArr = objToArray(templateDependencies);
    const targetDepArr = objToArray(targetDependencies);
    //  4. diff算法
    const newDep = depDiff(templateDepArr, targetDepArr);
    targetPkg.dependencies = arrayToObj(newDep);
    fse.writeJSONSync(targetPkgPath, targetPkg, {
      spaces: 2,
    });
    // 5. 自动安装依赖
    log.info("正在安装页面模板的依赖");
    await this.execCommand("npm install", path.dirname(targetPkgPath));
    log.success("安装页面模板依赖成功");
  }

  async downloadTemplate(addMode = ADD_MODE_PAGE) {
    // 模板名称
    const name = addMode === ADD_MODE_PAGE ? "页面" : "片段";
    // 缓存文件夹
    const targetPath = path.resolve(userHome, ".icya-cli", "template");
    // 缓存路径
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } =
      addMode === ADD_MODE_PAGE ? this.pageTemplate : this.sectionTemplate;
    // 构建Package对象
    const templatePackage = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    // 页面模板存在更新，不存在则下载
    if (!(await templatePackage.exists())) {
      const spinner = spinnerStart(`正在下载${name}模板...`);
      await sleep();
      try {
        await templatePackage.install();
      } finally {
        spinner.stop(true);
        if (await templatePackage.exists()) {
          log.success(`下载${name}模板成功`);
          if (addMode === ADD_MODE_PAGE) {
            this.pageTemplatePackage = templatePackage;
          } else {
            this.sectionTemplatePackage = templatePackage;
          }
        }
      }
    } else {
      const spinner = spinnerStart(`正在更新${name}模板...`);
      await sleep();
      try {
        await templatePackage.update();
      } finally {
        spinner.stop(true);
        if (await templatePackage.exists()) {
          log.success(`更新${name}模板成功`);
          if (addMode === ADD_MODE_PAGE) {
            this.pageTemplatePackage = templatePackage;
          } else {
            this.sectionTemplatePackage = templatePackage;
          }
        }
      }
    }
  }

  async getTemplate(addMode = ADD_MODE_PAGE) {
    const name = addMode === ADD_MODE_PAGE ? "页面" : "代码片段";
    const TEMPLATE =
      addMode === ADD_MODE_PAGE ? PAGE_TEMPLATE : SECTION_TEMPLATE;
    const { pageTemplate: pageTemplateName } = await inquirer.prompt({
      type: "list",
      name: "pageTemplate",
      message: `请选择${name}模板`,
      choices: this.createChoices(addMode),
    });
    // 2.1 输入页面名称
    const pageTemplate = TEMPLATE.find(
      (item) => item.npmName === pageTemplateName
    );
    if (!pageTemplate) {
      throw new Error(name + "模板不存在");
    }
    const { pageName } = await inquirer.prompt({
      type: "input",
      name: "pageName",
      message: `请输入${name}名称`,
      default: "",
      validate: function (value) {
        const done = this.async();
        if (!value || !value.trim()) {
          done(`请输入${name}名称`);
          return;
        }
        done(null, true);
      },
    });
    pageTemplate[addMode === ADD_MODE_PAGE ? "pageName" : "sectionName"] =
      pageName.trim();
    return pageTemplate;
  }

  createChoices(addMode) {
    return addMode === ADD_MODE_PAGE
      ? PAGE_TEMPLATE.map((item) => ({
          name: item.name,
          value: item.npmName,
        }))
      : SECTION_TEMPLATE.map((item) => ({
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
