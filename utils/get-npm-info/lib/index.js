"use strict";

const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

// 获取 npm 包信息
function getNpmInfo(npmName, registry) {
  // 包名不存在直接返回null
  if (!npmName) {
    return null;
  }
  // 默认使用淘宝源
  const registryUrl = registry || getDefaultRegistry();
  // 请求npm api 路径 https://registry.npmjs.org/@icya-cli/core
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  // 请求接口
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      if (res.status === 200) {
        return res.data;
      } else {
        return null;
      }
    })
    .catch((e) => {
      return Promise.reject(e);
    });
}

// 获取默认registry
function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? "https://registry.npmjs.org"
    : "https://registry.npm.taobao.org";
}

// 获取包的所有版本号
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  // 如果存在包信息，返回所有版本号, 否则返回空数组
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}

// 获取大于等于baseVersions的所有版本号，并从最新往后排序
function getNpmSemverVersions(baseVersion, versions) {
  return versions
    .filter((version) => {
      return semver.satisfies(version, `^${baseVersion}`);
    })
    .sort((a, b) => semver.gt(b, a));
}

// 获取包的最新版本(相对于某个包)
async function getNpmSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getNpmSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return null;
}

// 获取包最新版本
async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry);
  // 将versions 从新到旧排序
  if (versions) {
    return versions.sort((a, b) => semver.gt(b, a))[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion,
};
