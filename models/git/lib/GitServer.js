function error(methodName) {
  // 统一错误处理，必须实现moduleName的方法
  throw new Error(`${methodName} must be implemented`);
}

class GitServer {
  constructor(type, token) {
    // 仓库类型
    this.type = type;
    // 调用git远程api需要使用的token
    this.token = token;
  }
  // 更新 this.token
  setToken() {
    error("setToken");
  }

  // 创建远程仓库
  createRepo() {
    error("createRepo");
  }

  // 创建组织仓库
  creaetOrgRepo() {
    error("createOrgRepo");
  }

  // 获取远程仓库地址
  getRemote() {
    error("getRemote");
  }

  // 获取作者
  getUser() {
    error("getUser");
  }

  // ssh keys url
  getSSHKeyUrl() {
    error("getSSHKeyUrl");
  }

  // 生成远程仓库 token 相关的帮助文档
  getTokenHelpUrl() {
    error("getTokenHelpUrl");
  }
}

module.exports = GitServer;
