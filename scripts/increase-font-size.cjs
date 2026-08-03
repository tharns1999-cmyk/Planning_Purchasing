const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/features/purchasing');

function walkDir(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const filePath = path.join(currentDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      processFile(filePath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const sizeMap = {
    'text-[10px]': 'text-sm',
    'text-[11px]': 'text-sm',
    'text-xs': 'text-base',
    'text-sm': 'text-lg',
    'text-base': 'text-xl',
    'text-lg': 'text-2xl',
    'text-xl': 'text-3xl',
    'text-2xl': 'text-4xl',
    'text-3xl': 'text-5xl',
  };

  // We look for text- class in className attributes.
  // Instead of complex regex, let's just do a simple replacement for exact matches separated by space or quotes
  // We can use a regex that matches `text-\S+` and checks if it's in the map.
  const regex = /text-[a-zA-Z0-9\[\]-]+/g;
  
  const newContent = content.replace(regex, (match) => {
    return sizeMap[match] || match;
  });

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated fonts in ${filePath}`);
  }
}

walkDir(dir);
console.log('Done.');
