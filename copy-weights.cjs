/**
 * 从 face-api.js-master 复制模型权重文件到 public/models
 * 
 * 使用方式：
 *   node copy-weights.cjs
 * 
 * 如果终端无法运行，请手动复制：
 *   源: f:\课程\实践\1\smart-meet-ai(2)\face-api.js-master\face-api.js-master\weights\
 *   目标: f:\课程\实践\1\smart-meet-ai\public\models\
 */

const fs = require('fs');
const path = require('path');

const src = path.join('f:', '课程', '实践', '1', 'smart-meet-ai(2)', 'face-api.js-master', 'face-api.js-master', 'weights');
const dest = path.join('f:', '课程', '实践', '1', 'smart-meet-ai', 'public', 'models');

console.log('源目录:', src);
console.log('目标目录:', dest);

// 检查源目录是否存在
if (!fs.existsSync(src)) {
  console.error('错误：源目录不存在！');
  console.error('请检查路径:', src);
  process.exit(1);
}

// 创建目标目录
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
  console.log('已创建目标目录');
}

// 复制所有文件
const files = fs.readdirSync(src);
console.log('找到', files.length, '个文件需要复制');
let count = 0;
files.forEach(f => {
  const srcFile = path.join(src, f);
  const destFile = path.join(dest, f);
  
  // 只复制文件，跳过子目录
  if (fs.statSync(srcFile).isFile()) {
    fs.copyFileSync(srcFile, destFile);
    console.log('  已复制:', f);
    count++;
  }
});

console.log(`\n完成！共复制 ${count} 个文件到 public/models 目录`);
console.log('现在可以启动项目: npm run dev');
