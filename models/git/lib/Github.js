const GitServer = require("./GitServer");

class Github extends GitServer {
  constructor() {
    // 仓库类型是github
    super("github");
  }

  // ssh keys url
  getSSHKeyUrl() {
    return "https://github.com/settings/keys";
  }

  // 生成token帮助文档
  getTokenHelpUrl() {
    return "https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh";
  }
}

module.exports = Github;
