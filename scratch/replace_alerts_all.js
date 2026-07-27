const fs = require('fs');
const path = require('path');

const files = [
  'src/app/dashboard/sales/page.tsx',
  'src/app/dashboard/control-horario/page.tsx',
  'src/app/dashboard/contacts/page.tsx',
  'src/app/dashboard/agenda/page.tsx',
  'src/app/dashboard/almacen/page.tsx',
  'src/app/dashboard/account/page.tsx',
  'src/app/dashboard/statistics/page.tsx',
];

const importLine = `import { toast } from "@/components/ToastContainer";`;

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', filePath);
    return;
  }
  let c = fs.readFileSync(filePath, 'utf8');
  const before = (c.match(/\balert\s*\(/g) || []).length;
  if (before === 0) {
    console.log('No alerts in:', filePath);
    return;
  }

  // Add toast import if not already present
  if (!c.includes("from \"@/components/ToastContainer\"")) {
    // Insert after first import block (after first import line)
    c = c.replace(/^(import .+?;\n)/m, `$1${importLine}\n`);
  }

  const alertRegex = /\balert\(([^;]+?)\);/g;
  c = c.replace(alertRegex, (m, inner) => {
    const trimmed = inner.trim();
    if (
      /Error|error/.test(trimmed) &&
      !/correctamente|exito|éxito|guardad|elimina|creado|asociad|sincronizado|pagad|restaurad|desbloquea|aceptado|enviado/.test(trimmed)
    ) {
      return `toast.error(${inner});`;
    }
    if (/Por favor|selecciona|debe|Debe|obligatorio|vacío|ingrese|sube únicamente|distinta de cero|mayor a cero|permite las ventanas|no puede ser anterior|fecha final/.test(trimmed)) {
      return `toast.warning(${inner});`;
    }
    if (/eliminad|desvinculado|papelera|enviado a la papelera/.test(trimmed) && !/Error/.test(trimmed)) {
      return `toast.info(${inner});`;
    }
    return `toast.success(${inner});`;
  });

  const after = (c.match(/\balert\s*\(/g) || []).length;
  fs.writeFileSync(filePath, c);
  console.log(`${filePath}: ${before} -> ${after} alerts`);
});
