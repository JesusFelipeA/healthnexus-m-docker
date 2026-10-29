// Revisa que el proyecto esté listo para generar la versión que se sube a Play Store.
//   Uso:  npm run release:check        (también se ejecuta antes de npm run release:aab / release:apk)
//   Otro ambiente:  HN_AMBIENTE=staging node scripts/verificar-release.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const errores = [];
const avisos = [];
const ok = [];

// 1) Node mínimo que exige React Native 0.87
const [major, minor] = process.versions.node.split('.').map(Number);
(major > 22 || (major === 22 && minor >= 11)) ? ok.push(`Node ${process.versions.node}`) : errores.push(`Node ${process.versions.node}: React Native 0.87 exige 22.11 o superior.`);

// 2) URL del ambiente que se compila (ambientes.json; prod si no se indica)
const { resolverAmbiente } = require('./set-env');
const ambiente = process.env.HN_AMBIENTE || 'prod';
const leerJson = (p) => (exists(p) ? JSON.parse(read(p)) : {});
if (!exists('ambientes.json')) errores.push('Falta ambientes.json con las URL de cada ambiente.');
else {
  // Para release no se usa ambientes.local.json: la URL debe ser la del repositorio
  const r = resolverAmbiente(ambiente, leerJson('ambientes.json'));
  if (r.error) errores.push(r.error);
  else ok.push(`Ambiente ${ambiente}: API_URL = ${r.url}`);
  const dev = ((leerJson('ambientes.json').dev || {}).url) || '';
  if (/\b(192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(dev)) avisos.push('ambientes.json tiene la IP de tu red local en "dev": muévela a ambientes.local.json, que no se sube a Git.');
}

// 3) Versión
const props = read('android/gradle.properties');
const code = (props.match(/^hnVersionCode=(.*)$/m) || [])[1];
const name = (props.match(/^hnVersionName=(.*)$/m) || [])[1];
if (!/^\d+$/.test(code || '') || Number(code) < 1) errores.push('hnVersionCode (android/gradle.properties) debe ser un entero mayor o igual a 1.');
else ok.push(`versionCode ${code} (súbelo en cada publicación)`);
if (!/^\d+\.\d+\.\d+$/.test(name || '')) errores.push('hnVersionName (android/gradle.properties) debe tener el formato 1.0.0.');
else ok.push(`versionName ${name}`);
const pkgVersion = JSON.parse(read('package.json')).version;
if (name && pkgVersion !== name) avisos.push(`package.json version (${pkgVersion}) no coincide con hnVersionName (${name}); la pantalla de inicio de sesión muestra la de package.json.`);

// 4) Firma de release
if (!exists('android/keystore.properties')) {
  errores.push('Falta android/keystore.properties (llave de firma). Mira docs/PLAY_STORE.md, paso 1.');
} else {
  const ks = Object.fromEntries(read('android/keystore.properties').split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  const faltan = ['storeFile', 'storePassword', 'keyAlias', 'keyPassword'].filter((k) => !ks[k] || /CAMBIA_ESTA/.test(ks[k]));
  if (faltan.length) errores.push(`android/keystore.properties incompleto o con valores de ejemplo: ${faltan.join(', ')}.`);
  else if (!fs.existsSync(path.resolve(root, 'android', ks.storeFile))) errores.push(`No existe el archivo de llave: android/${ks.storeFile}`);
  else ok.push(`Llave de firma: android/${ks.storeFile}`);
}

// 5) Recursos de la tienda
['android/app/src/main/res/playstore-icon.png', 'play-store/feature-graphic-1024x500.png', 'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml']
  .forEach((f) => (exists(f) ? ok.push(f) : errores.push(`Falta ${f}`)));

// 6) Permisos declarados (informativo, para el formulario de seguridad de datos)
const manifest = read('android/app/src/main/AndroidManifest.xml');
const permisos = [...manifest.matchAll(/uses-permission android:name="android\.permission\.([A-Z_]+)"/g)].map((m) => m[1]);
ok.push(`Permisos: ${permisos.join(', ') || 'ninguno'}`);

console.log('\nREVISIÓN PREVIA A LA PUBLICACIÓN\n');
ok.forEach((m) => console.log(`  ✔ ${m}`));
avisos.forEach((m) => console.log(`  ⚠ ${m}`));
errores.forEach((m) => console.log(`  ✖ ${m}`));
console.log(errores.length ? `\n${errores.length} problema(s) por resolver antes de generar el AAB.\n` : '\nTodo listo para generar el AAB.\n');
process.exit(errores.length ? 1 : 0);
