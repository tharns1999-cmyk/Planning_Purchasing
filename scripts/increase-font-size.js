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
  
  // Replace from largest to smallest to avoid double replacement
  // We use a temporary token mechanism or regex boundary to avoid matching already replaced parts.
  // E.g., text-base -> text-lg
  // But wait, if text-sm -> text-base, and then text-base -> text-lg, it will double jump!
  // To avoid this, we can replace them with placeholders first, or use a replacer function.

  const sizeMap = {
    'text-\\[10px\\]': 'text-sm',
    'text-\\[11px\\]': 'text-sm',
    'text-xs': 'text-base', // skip sm for better readability
    'text-sm': 'text-lg',
    'text-base': 'text-xl',
    'text-lg': 'text-2xl',
    'text-xl': 'text-3xl',
    'text-2xl': 'text-4xl',
    'text-3xl': 'text-5xl',
  };

  const regex = new RegExp(`\\b(${Object.keys(sizeMap).join('|')})\\b`, 'g');
  
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
