const ResumableUpload = require('./youtube/node-youtube-upload');
let resumableUpload = new ResumableUpload();
const googleToken = require('./youtube/quickstart')
const metadata = {
  kind: 'youtube#video',
  snippet: {
    title: '测试'
  }
}

let init = async (resumableUpload) => {
  const auth = await googleToken()
  const token = auth.credentials
  resumableUpload.tokens = token; //Google OAuth2 tokens
  resumableUpload.filepath = '/Users/charmingyouyou/Desktop/为什么.mp4';
  resumableUpload.metadata = metadata; //include the snippet and status for the video
  resumableUpload.retry = 3;
  resumableUpload.upload();
  resumableUpload.on('progress', function(progress) {
    console.log(progress);
  });
  resumableUpload.on('success', function(success) {
    console.log(success);
  });
  resumableUpload.on('error', function(error) {
    console.log(error);
  });
}

init(resumableUpload)