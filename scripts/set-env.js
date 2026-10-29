// Elige el ambiente de la app (dev, staging o prod) y escribe src/env.js con la URL de su API.
//   node scripts/set-env.js dev | staging | prod     cambia de ambiente
//   node scripts/set-env.js --si-falta dev           crea src/env.js solo si no existe (npm install, npm start)
//   node scripts/set-env.js --mostrar                muestra el ambiente actual
// Las URL salen de ambientes.json; ambientes.local.json (opcional, fuera de Git) las sobrescribe en tu PC.
// En la app no hay secretos: todo lo que va dentro del APK se puede extraer.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const AMBIENTES = ['dev', 'staging', 'prod'];
const DESTINO = path.join(root, 'src', 'env.js');

function leerJson(archivo) {
  const ruta = path.join(root, archivo);
  return fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, 'utf8')) : {};
}

/** Devuelve { url, error } del ambiente pedido, aplicando ambientes.local.json encima de ambientes.json. */
function resolverAmbiente(nombre, base, local = {}) {
  if (!AMBIENTES.includes(nombre)) return { error: `Ambiente desconocido "${nombre}". Usa: ${AMBIENTES.join(', ')}.` };
  const url = String(((local[nombre] || {}).url) || ((base[nombre] || {}).url) || '').replace(/\/$/, '');
  if (!url) return { error: `ambientes.json no tiene URL para "${nombre}".` };
  if (!/^https?:\/\/[^\s/]+/.test(url)) return { error: `La URL de "${nombre}" no es válida: ${url}` };
  if (nombre !== 'dev' && !url.startsWith('https://')) return { error: `La URL de "${nombre}" debe usar HTTPS (ahora: ${url}).` };
  if (/TU-DOMINIO|TU-SERVIDOR/i.test(url)) return { error: `La URL de "${nombre}" sigue con el valor de ejemplo (${url}). Edítala en ambientes.json.` };
  return { url };
}

function contenidoEnv(nombre, url) {
  return `// Generado por scripts/set-env.js. No lo edites ni lo subas a Git: usa npm run env:dev | env:staging | env:prod\nexport const AMBIENTE = '${nombre}';\nexport const API_URL = '${url}';\n`;
}

function ambienteActual() {
  if (!fs.existsSync(DESTINO)) return null;
  const m = fs.readFileSync(DESTINO, 'utf8').match(/AMBIENTE = '([a-z]+)'[\s\S]*API_URL = '([^']+)'/);
  return m ? { nombre: m[1], url: m[2] } : null;
}

function escribir(nombre) {
  const r = resolverAmbiente(nombre, leerJson('ambientes.json'), leerJson('ambientes.local.json'));
  if (r.error) throw new Error(r.error);
  fs.writeFileSync(DESTINO, contenidoEnv(nombre, r.url));
  return r.url;
}

module.exports = { resolverAmbiente, contenidoEnv, ambienteActual, escribir, DESTINO, AMBIENTES };

if (require.main === module) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === '--mostrar') {
      const a = ambienteActual();
      console.log(a ? `Ambiente: ${a.nombre} → ${a.url}` : 'Todavía no hay src/env.js: ejecuta npm run env:dev');
    } else if (args[0] === '--si-falta') {
      if (!ambienteActual()) console.log(`Ambiente ${args[1] || 'dev'} → ${escribir(args[1] || 'dev')}`);
    } else {
      console.log(`Ambiente ${args[0]} → ${escribir(args[0])}`);
    }
  } catch (e) {
    console.error(`✖ ${e.message}`);
    process.exit(1);
  }
}
