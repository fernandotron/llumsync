const fs = require('fs');
let c = fs.readFileSync('src/app/dashboard/settings/page.tsx', 'utf8');

const alertRegex = /\balert\(([^;]+?)\);/g;

c = c.replace(alertRegex, (m, inner) => {
  const trimmed = inner.trim();
  if (
    /Error|error/.test(trimmed) &&
    !/correctamente|exito|éxito|guardad|elimina|creado|asociad|sincronizado|pagad|restaurad|desbloquea/.test(trimmed)
  ) {
    return `toast.error(${inner});`;
  }
  if (/Por favor|selecciona|debe|Debe|obligatorio|vacío|ingrese|sube únicamente|distinta de cero|mayor a cero/.test(trimmed)) {
    return `toast.warning(${inner});`;
  }
  if (/eliminad|desvinculado|papelera/.test(trimmed) && !/Error/.test(trimmed)) {
    return `toast.info(${inner});`;
  }
  return `toast.success(${inner});`;
});

const remaining = (c.match(/\balert\s*\(/g) || []).length;
fs.writeFileSync('src/app/dashboard/settings/page.tsx', c);
console.log('Remaining alert() calls:', remaining);
