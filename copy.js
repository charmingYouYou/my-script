const util = require("util");
const exec = util.promisify(require("child_process").exec);
const [fileArrJSON, findPwd, copyPwd] = process.argv.slice(2)

async function getFile() {
  const fileArr = JSON.parse(fileArrJSON)
  fileArr.map(async file => {
    const { stdout } = await exec(`find ${findPwd} -name "${file}.*"`)
    if (stdout) {
      const arr = stdout.split(/\r?\n/).filter(file => file)
      await Promise.all(arr.map(async file => {
        console.log(file);
        await exec(`cp ${file} ${copyPwd}`)
      }))
    } else {
      console.log(`${findPwd}目录下${file}不存在, 请检查`);
    }
  })
}

getFile()