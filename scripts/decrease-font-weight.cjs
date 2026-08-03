const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const targetDir = path.join(__dirname, '../src/features/purchasing');
const files = getFiles(targetDir);

const weightMap = {
  'font-black': 'font-bold',
  'font-extrabold': 'font-semibold',
  'font-bold': 'font-medium',
  'font-semibold': 'font-medium',
  'font-medium': 'font-normal'
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  Object.keys(weightMap).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    content = content.replace(regex, weightMap[key]);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

console.log('Font weights decreased successfully.');
