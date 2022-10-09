const GitServer = require("./GitServer");

class Gitee extends GitServer {
  constructor() {
    // 仓库类型是gitee
    super("gitee");
  }

  // ssh keys url
  getSSHKeyUrl() {
    return "https://gitee.com/profile/sshkeys";
  }

  // 生成token帮助文档
  getTokenHelpUrl() {
    return "https://gitee.com/help/articles/4191";
  }
}

module.exports = Gitee;
