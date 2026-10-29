// Ejecuta Gradle en la carpeta android/ en cualquier sistema:  node scripts/gradle.js bundleRelease
const { spawnSync } = require('child_process');
const path = require('path');

const dir = path.join(__dirname, '..', 'android');
const win = process.platform === 'win32';
const r = spawnSync(win ? 'gradlew.bat' : './gradlew', process.argv.slice(2), { cwd: dir, stdio: 'inherit', shell: win });
process.exit(r.status === null ? 1 : r.status);
