#! /usr/bin/env node

const importLocal = require("import-local");

// 如果项目本地安装了icya-cli，则使用本地，否则使用全局的
if (importLocal(__filename)) {
  require("npmlog").info("cli", "正在使用icya-cli本地版本");
} else {
  console.log(__filename);

  require("../lib")(process.argv.slice(2));
}
