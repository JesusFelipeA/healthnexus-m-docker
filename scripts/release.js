// Compila una versión release apuntando al ambiente indicado y deja el ambiente como estaba.
//   node scripts/release.js prod aab       → AAB para Play Store (solo se permite prod)
//   node scripts/release.js prod apk       → APK de producción para instalar y probar
//   node scripts/release.js staging apk    → APK que apunta al servidor de QA
const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');
const { escribir, DESTINO } = require('./set-env');

const [ambiente, tipo] = process.argv.slice(2);
if (!['staging', 'prod'].includes(ambiente) || !['apk', 'aab'].includes(tipo)) {
  console.error('Uso: node scripts/release.js <staging|prod> <apk|aab>');
  process.exit(2);
}
if (tipo === 'aab' && ambiente !== 'prod') {
  console.error('✖ El AAB se sube a Play Store: solo se genera para prod.');
  process.exit(2);
}

const anterior = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, 'utf8') : null;
const correr = (cmd, args, env = {}) => spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } }).status;
let status = 1;
try {
  console.log(`\nAmbiente ${ambiente} → ${escribir(ambiente)}`);
  status = correr(process.execPath, [path.join(__dirname, 'verificar-release.js')], { HN_AMBIENTE: ambiente });
  if (status === 0) {
    status = correr(process.execPath, [path.join(__dirname, 'gradle.js'), 'clean', tipo === 'aab' ? 'bundleRelease' : 'assembleRelease']);
  }
} catch (e) {
  console.error(`✖ ${e.message}`);
} finally {
  if (anterior !== null) fs.writeFileSync(DESTINO, anterior);
  else fs.rmSync(DESTINO, { force: true });
}
if (status === 0) {
  const salida = tipo === 'aab' ? 'android/app/build/outputs/bundle/release/app-release.aab' : 'android/app/build/outputs/apk/release/app-release.apk';
  console.log(`\n✔ ${tipo.toUpperCase()} de ${ambiente}: ${salida}\n  (src/env.js volvió a su ambiente anterior)\n`);
}
process.exit(status || 0);
