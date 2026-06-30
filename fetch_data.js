const https = require('https');
const fs = require('fs');

const transUrl = 'https://prod-tingwu-paas-common-beijing.oss-cn-beijing.aliyuncs.com/tingwu/output/1226341769466572/1eb8164f35354ee0988965d89de84416/1eb8164f35354ee0988965d89de84416_Transcription_20260507224330.json?Expires=1780757033&OSSAccessKeyId=LTAI5tMzZ1D4o1drkJN1TfCr&Signature=x2iZVZeaDp9AKcaQISbgVIw7NxA%3D';
const sumUrl = 'https://prod-tingwu-paas-common-beijing.oss-cn-beijing.aliyuncs.com/tingwu/output/1226341769466572/1eb8164f35354ee0988965d89de84416/1eb8164f35354ee0988965d89de84416_Summarization_20260507224350.json?Expires=1780757033&OSSAccessKeyId=LTAI5tMzZ1D4o1drkJN1TfCr&Signature=ird%2FwAo0NFskGIAIKqjq9P3EFqg%3D';

function download(url, filename) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        fs.writeFileSync(filename, data);
        console.log(`Saved ${filename}, size: ${data.length}`);
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function main() {
  await download(transUrl, 'C:/Users/Administrator/Desktop/smart-meet-ai/transcription_sample.json');
  await download(sumUrl, 'C:/Users/Administrator/Desktop/smart-meet-ai/summarization_sample.json');
  console.log('Done!');
}

main().catch(console.error);
