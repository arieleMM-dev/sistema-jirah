// GHSA-vfj7-8cjw-p6xm: no hay versión publicada corregida de braces 3.0.3.
// Limitar el AST que generan los patrones de glob usados por las herramientas del proyecto.
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const file = require.resolve('braces/lib/parse.js');
const version = require('braces/package.json').version;
if (version !== '3.0.3') throw new Error('Cambió braces: revise la mitigación de seguridad antes de actualizar.');
const original = fs.readFileSync(file, 'utf8');
const marker = "    if (stack.length > 128) throw new SyntaxError('Brace nesting exceeds the application safety limit');";
const anchor = '  while (index < length) {\n';
const expectedHash = 'e572166565f15fa6ad9865ae49d678218e32aabfd1b3720f6d0d43d39800d310';
const unpatched = original.replace(marker + '\n', '');
if (createHash('sha256').update(unpatched).digest('hex') !== expectedHash) {
  throw new Error('El código de braces no coincide con la versión revisada. No se aplicó una modificación desconocida.');
}
if (!original.includes(marker)) {
  if (process.argv.includes('--check')) throw new Error('Falta aplicar la mitigación: ejecute node scripts/harden-braces.cjs');
  fs.writeFileSync(file, original.replace(anchor, anchor + marker + '\n'));
  console.log('Mitigación de profundidad aplicada a braces 3.0.3. El aviso del registro npm permanece hasta una corrección oficial.');
}
