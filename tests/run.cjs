const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const temporaryRoot = path.resolve(os.tmpdir());
const testDirectory = fs.mkdtempSync(path.join(temporaryRoot, 'jirah-security-'));
let result;
try {
  result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'security.test.cjs'), path.join(__dirname, 'bootstrap.test.cjs')], {
    stdio: 'inherit',
    env: { ...process.env, JIRAH_TEST_DIRECTORY: testDirectory, JIRAH_HTTP_TEST: process.argv.includes('--http') || process.argv.includes('--browser') ? '1' : '0', JIRAH_BROWSER_TEST: process.argv.includes('--browser') ? '1' : '0', JIRAH_MAIL_TEST: process.argv.includes('--mail') ? '1' : '0' },
  });
  if (result.error) throw result.error;
} finally {
  // El proceso hijo ya terminó: libsql ha liberado sus archivos en Windows.
  if (path.dirname(path.resolve(testDirectory)) !== temporaryRoot ||
      !path.basename(testDirectory).startsWith('jirah-security-')) {
    throw new Error('Directorio de limpieza fuera del ámbito de pruebas');
  }
  fs.rmSync(testDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
process.exitCode = result.status ?? 1;
