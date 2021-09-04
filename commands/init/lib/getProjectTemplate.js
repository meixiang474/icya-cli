const request = require("@icya-cli/request");

module.exports = function () {
  return request({
    url: "/project/template",
  });
};
