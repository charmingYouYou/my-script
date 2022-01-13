#!/usr/bin/env node
const Client = require("ssh2").Client;
const inquirer = require("inquirer");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const exists = util.promisify(require("fs").exists);
const { projectConfig, envConfig } = require("./config.js");
const client = new Client();
// 输出当前目录（不一定是代码所在的目录）下的文件和文件夹

class Build {
  constructor() {
    this.project = "";
    this.branch = "";
    this.buildBranch = "";
    this.branchList = [];
    this.projectInfo = {};
    this.options = {};
  }

  async getQuery() {
    // 读取项目
    await this.readProject();
    await this.readEnv();
    debugger
    if (await exists(this.options.cwd)) {
      try {
        await this.getBranchList();
      } catch (err) {
        console.log(err);
        return false;
      }
    } else {
      console.log(`当前目录${this.options.cwd}不存在, 请修改后重新执行该程序`);
      return false;
    }
    // 读取需要合并分支
    await this.readBranch();
    // 执行命令
    await this.executeCommand();
    console.log("执行完毕");
  }

  readProject() {
    return inquirer
      .prompt({
        name: "project",
        type: "list",
        message: "请选择要操作的项目",
        choices: Object.keys(projectConfig),
        pageSize: 5,
      })
      .then((res) => {
        this.project = res.project;
        this.projectInfo = projectConfig[this.project];
        this.options = {
          cwd: `${this.projectInfo.cwd}${this.project.split(":")[0]}`,
          encoding: "utf-8",
        };
      });
  }

  readEnv() {
    return inquirer
      .prompt({
        name: "env",
        type: "list",
        message: "请选择要部署的环境",
        choices: Object.keys(envConfig),
        pageSize: 5,
      })
      .then((res) => {
        this.buildBranch = res.env;
      });
  }

  async getBranchList() {
    return await exec(`git branch`, this.options)
      .then(({ stdout, stderr }) => {
        this.branchList = stdout
          .trim()
          .replace(/ /g, "")
          .replace("*", "")
          .split("\n");
      })
      .catch((err) => {
        throw err.stderr;
      });
  }

  async readBranch() {
    return inquirer
      .prompt({
        name: "branch",
        type: "list",
        message: "请选择需要合并的分支",
        choices: this.branchList,
        pageSize: this.branchList.length,
        default: await this.getDefaultBranch(),
      })
      .then((res) => {
        this.branch = res.branch;
      });
  }

  async executeCommand() {
    let command = this.execFun();
    await command(`git checkout ${this.buildBranch}`);
    await command(`git pull origin ${this.buildBranch}`);
    await command(`git merge ${this.branch}`);
    await command(`git push origin ${this.buildBranch}`);
    if (this.projectInfo.slot && this.projectInfo.slot.length) {
      await Promise.all(
        this.projectInfo.slot.map(async (commandLine) => {
          await command(commandLine);
        })
      );
    }
    await command(`git checkout ${this.branch}`);
    this.projectInfo.open && (await this.openURL());
    this.projectInfo.ssh && (await this.sshLogin());
  }

  async getDefaultBranch() {
    let { stdout } = await exec(`git branch | grep '*'`, this.options);
    return stdout.trim().replace(/ /g, "").replace("*", "");
  }

  execFun(options = this.options) {
    return async (command) => {
      try {
        await exec(command, options)
          .then(({ stdout, stderr }) => {
            console.log(stdout);
            console.log(stderr);
          })
          .catch((err) => {
            throw `执行${command}错误: ${err.stderr}`;
          });
      } catch (err) {
        console.log(`${err}`);
        process.exit(1);
      }
    };
  }

  async sshLogin() {
    return new Promise((resolve, reject) => {
      client
        .on("ready", () => {
          console.log(`ssh已连接!`);
          client.shell((err, stream) => {
            if (err) throw err;
            stream.setEncoding("utf-8");
            stream
              .on("data", (data) => {
                console.log(data);
              })
              .on("close", () => {
                console.log("测试环境部署完毕, 关闭ssh");
                client.end();
                resolve();
              });
            stream.end(this.projectInfo.ssh.command);
          });
        })
        .connect(this.projectInfo.ssh.config);
    });
  }

  openURL() {
    let command = this.execFun();
    command(`open ${this.projectInfo.open}`)
  }
}

new Build().getQuery();
