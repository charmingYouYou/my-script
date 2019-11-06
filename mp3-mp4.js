const {promisify} = require('util')
const exec = promisify(require('child_process').exec);
const puppeteer = require('puppeteer');
const readdir  = promisify(require('fs').readdir);
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = promisify(ffmpeg.ffprobe)

const pwd = '/Users/charmingyouyou/Desktop/music'
const linkUrl = 'file:///Users/charmingyouyou/Desktop/ycsx/dev-build/index.html'

class Transform {
  constructor () {}

  async init () {
    console.log('开始生成图片')
    const dirNameList = await this.createMusicPic()
    console.log(`图片生成完毕, 共生成${dirNameList.length}张图片`)
    console.log('开始将图片音频生成视频')
    for (let i = 0, j = dirNameList.length; i < j; i++) {
      await this.createVideo(dirNameList[i])
    }
    console.log('执行完毕')
  }

  async createMusicPic () {
    let dirList = await readdir(`${pwd}`)
    dirList = dirList.filter(dir => dir !== '.DS_Store' && dir.indexOf('jpg') === -1)
    let dirNameList = dirList.map(dir => dir.split('.')[0])
    let linkList = dirList.map(dir => `${linkUrl}?text=${dir.split('.')[0]}`)
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.emulate({
      viewport: {
        width: 1920,
        height: 1080
      },
      userAgent: ''
    });
    for (let i = 0, j = linkList.length; i < j; i++) {
      await page.goto(linkList[i]);
      await page.screenshot({ path: `${pwd}/${dirNameList[i]}.jpg`, fullPage: true });
    }
    await browser.close();
    return dirNameList
  }

  async createVideo (dirName) {
    const curPath = `${pwd}/${dirName}`
    const options = {
      cwd: `${curPath}`,
      encoding: 'utf-8'
    }
    const command = this.execFun(options)
    let fileList = await readdir(`${curPath}`)
    fileList = fileList.filter(file => file !== '.DS_Store' && file.indexOf('mp4') === -1)
    let fileNameList = fileList.map(file => file.split('.')[0])
    for (let i = 0, j = fileList.length; i < j; i++) {
      let videoInfo = await ffprobe(`${curPath}/${fileList[i]}`)
      const duration = videoInfo.streams[0].duration
      await command(`ffmpeg -r 15 -f image2 -loop 1 -i ${pwd}/${dirName}.jpg -i ${curPath}/${fileList[i]} -s 1920x1080 -pix_fmt yuvj420p -t ${duration} -vcodec libx264 ${curPath}/${fileNameList[i]}.mp4`)
      console.log(`当前进度${(i + 1) / j * 100}%, 生成${fileNameList[i]}.mp4`)
    }
  }

  execFun (options) {
    return async (command) => {
      try {
        await exec(command, options).then(({stdout, stderr}) => {
          console.log(stdout)
          console.log(stderr)
        }).catch(err => {
          throw `执行${command}错误: ${err.stderr}`
        })
      } catch (err) {
        console.log(`${err}`)
      }
    }
  }
}

const transform = new Transform()
transform.init()