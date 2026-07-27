const fs = require('fs');

const files = [
  'src/app/dashboard/sales/page.tsx',
  'src/app/dashboard/agenda/page.tsx',
  'src/app/dashboard/contacts/page.tsx',
];

const importLine = `import { toast } from "@/components/ToastContainer";`;

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log('SKIP:', filePath);
    return;
  }
  let c = fs.readFileSync(filePath, 'utf8');
  if (c.includes('from "@/components/ToastContainer"')) {
    console.log('Already has import:', filePath);
    return;
  }

  // Find the last import line and insert after it
  const lines = c.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIdx = i;
    } else if (lastImportIdx > 0 && lines[i].trim() !== '' && !lines[i].trim().startsWith('import ')) {
      break;
    }
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
    c = lines.join('\n');
    fs.writeFileSync(filePath, c);
    console.log('Added import to:', filePath);
  } else {
    console.log('Could not find import location:', filePath);
  }
});
