"use strict";

const log = require("npmlog");

// 初始化level, 没有环境变量就给一个默认的level
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

// 定制log前缀
log.heading = "icya";
log.headingStyle = { fg: "white", bg: "green" };

// 定制一个log种类
log.addLevel("success", 2000, { fg: "green", bold: true });

module.exports = log;
