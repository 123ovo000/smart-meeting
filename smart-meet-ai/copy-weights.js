const fs = require('fs');
const path = require('path');

const src = path.join('f:', '课程', '实践', '1', 'smart-meet-ai(2)', 'face-api.js-master', 'face-api.js-master', 'weights');
const dest = path.join('f:', '课程', '实践', '1', 'smart-meet-ai', 'public', 'models');

console.log('Source:', src);
console.log('Dest:', dest);

// Create destination directory
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
  console.log('Created destination directory');
}

// Copy all files
const files = fs.readdirSync(src);
console.log('Found', files.length, 'files to copy');
files.forEach(f => {
  const srcFile = path.join(src, f);
  const destFile = path.join(dest, f);
  fs.copyFileSync(srcFile, destFile);
  console.log('  Copied:', f);
});

console.log('\nAll files copied successfully!');
