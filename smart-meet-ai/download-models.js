const https = require('https');
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const modelFiles = [
  // TinyFaceDetector
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  // FaceExpressionNet
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
];

// 多个备选下载源
const baseUrls = [
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/',
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights/',
  'https://justadudewhohacks.github.io/face-api.js/weights/'
];

function downloadFile(baseUrl, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(modelsDir, filename);
    const file = fs.createWriteStream(filePath);
    
    console.log(`Downloading ${filename} from ${baseUrl}...`);
    
    https.get(`${baseUrl}${filename}`, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`  ✓ Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function downloadFileWithFallback(filename) {
  for (const baseUrl of baseUrls) {
    try {
      await downloadFile(baseUrl, filename);
      return; // 下载成功
    } catch (err) {
      console.warn(`  ✗ Failed: ${err.message}`);
      // 继续尝试下一个源
    }
  }
  console.error(`  ✗ All sources failed for ${filename}`);
}

async function downloadAll() {
  console.log('=== 开始下载 face-api.js 模型文件 ===\n');
  console.log(`模型保存目录: ${modelsDir}\n`);
  
  for (const file of modelFiles) {
    await downloadFileWithFallback(file);
  }
  
  console.log('\n=== 下载完成! ===');
  console.log('提示: 如果下载失败，请检查网络连接后重试。');
  console.log('也可以手动从以下地址下载模型文件放到 public/models 目录:');
  console.log('  https://github.com/justadudewhohacks/face-api.js/tree/master/weights');
}

downloadAll();
