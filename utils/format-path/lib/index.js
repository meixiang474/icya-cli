"use strict";

const path = require("path");

// windows兼容路径
function formatPath(p) {
  if (p && typeof p === "string") {
    const sep = path.sep;
    if (sep === "/") {
      // macos 直接返回
      return p;
    } else {
      // windows将 \ 替换成 /
      return p.replace(/\\/g, "/");
    }
  }
  return p;
}

module.exports = formatPath;
