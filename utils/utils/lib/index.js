"use strict";

// 判断是否是对象类型
function isObject(o) {
  return Object.prototype.toString.call(o) === "[object Object]";
}

module.exports = {
  isObject,
};
