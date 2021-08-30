"use strict";

function init(projectName, cmdObj) {
  console.log(projectName, cmdObj.force, process.env.CLI_TARGET_PATH);
  console.log("test");
}

module.exports = init;
