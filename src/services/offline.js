// Modo sin conexión, fase 1: signos vitales.
//
// Qué se guarda (cifrado en el Keystore, ver secureStorage.js):
//   usuario    los datos de la sesión, para abrir la app sin red sin cerrar la sesión
//   pacientes  la lista del selector (id, nombre, edad, sexo), vigente 12 horas, igual que la web
//   cola       los signos capturados sin conexión, con un clientUuid y la hora real de la toma
// Al reconectar, sincronizarSignos() envía la cola en orden. La API no duplica un registro que llegue dos veces
// (mismo clientUuid), así que un reintento después de un corte a medio envío es seguro.
import { guardarOffline, leerOffline } from './secureStorage';
import { mensajeApi } from '../utils/errors';

export const VIGENCIA_PACIENTES_MS = 12 * 60 * 60 * 1000;
export const MAX_ATRASO_MS = 72 * 60 * 60 * 1000; // la API rechaza registros con más de 72 h

const vacio = () => ({ usuario: null, pacientes: null, cola: [] });

// Las lecturas y escrituras se hacen de una en una para que dos pantallas no se pisen la cola
let fila = Promise.resolve();
function enSerie(fn) {
  const r = fila.then(fn, fn);
  fila = r.catch(() => {});
  return r;
}
async function leer() {
  const d = await leerOffline();
  return d && typeof d === 'object' ? { ...vacio(), ...d, cola: Array.isArray(d.cola) ? d.cola : [] } : vacio();
}
const escribir = (d) => guardarOffline(d).catch(() => {});

// Avisos a las pantallas cuando cambia la cola
const oyentes = new Set();
export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}
const avisar = () => oyentes.forEach((fn) => { try { fn(); } catch { /* una pantalla desmontada no detiene a las demás */ } });

/** UUID versión 4 (Hermes no trae crypto.randomUUID). La API además lo protege con un índice único. */
export function nuevoUuid() {
  const h = [];
  for (let i = 0; i < 32; i++) h.push(Math.floor(Math.random() * 16));
  h[12] = 4;
  h[16] = 8 + (h[16] % 4);
  const s = h.map((n) => n.toString(16)).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Errores que significan "no hay conexión con el servidor" (sin red o servidor apagado). */
export const esSinConexion = (e) => !!e && Number(e.status) === 0 && e.code !== 'INSECURE_TRANSPORT';

/* ---------- sesión ---------- */
export const guardarUsuario = (usuario) => enSerie(async () => {
  const d = await leer();
  // Si entra otra cuenta en el teléfono, la lista de pacientes anterior ya no le corresponde
  if (d.usuario && usuario && d.usuario.id !== usuario.id) d.pacientes = null;
  d.usuario = usuario;
  await escribir(d);
});
export const usuarioGuardado = () => enSerie(async () => (await leer()).usuario);

/** Al cerrar sesión se borran la sesión y los pacientes; la cola se conserva para enviarla cuando esa cuenta vuelva a entrar. */
export const cerrarSesionOffline = () => enSerie(async () => {
  const d = await leer();
  d.usuario = null;
  d.pacientes = null;
  await escribir(d);
});

/* ---------- pacientes del selector ---------- */
export const guardarPacientes = (userId, lista) => enSerie(async () => {
  const d = await leer();
  d.pacientes = {
    userId,
    guardadoEn: Date.now(),
    lista: (lista || []).map((p) => ({ id: p.id, name: p.name, age: p.age, sexo: p.sexo })),
  };
  await escribir(d);
});
export const pacientesGuardados = (userId) => enSerie(async () => {
  const p = (await leer()).pacientes;
  if (!p || p.userId !== userId || Date.now() - p.guardadoEn > VIGENCIA_PACIENTES_MS) return null;
  return p;
});

/* ---------- cola de signos vitales ---------- */
export const encolarSignos = (userId, body, pacienteNombre) => enSerie(async () => {
  const d = await leer();
  const item = { clientUuid: nuevoUuid(), userId, capturadoEn: new Date().toISOString(), pacienteNombre, body, estado: 'pendiente', error: null };
  d.cola.push(item);
  await escribir(d);
  avisar();
  return item;
});
export const colaDe = (userId) => enSerie(async () => (await leer()).cola.filter((i) => i.userId === userId));

/** Quita de la cola un registro que la API rechazó (después de que la enfermera lo revisó). */
export const descartar = (userId, clientUuid) => enSerie(async () => {
  const d = await leer();
  d.cola = d.cola.filter((i) => !(i.userId === userId && i.clientUuid === clientUuid));
  await escribir(d);
  avisar();
});

let sincronizando = null;
/**
 * Envía los pendientes de esa cuenta, en el orden en que se capturaron.
 *   - aceptado (201) o ya recibido (200 duplicado): sale de la cola
 *   - sin conexión, 401 o error del servidor (5xx): se detiene y se reintenta después
 *   - rechazado (400, 403, 404, 409): queda marcado con el motivo para que la enfermera lo revise; no se reintenta solo
 * Devuelve { enviados, rechazados, pendientes, sinConexion }.
 */
export function sincronizarSignos(userId, enviar) {
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    const r = { enviados: 0, rechazados: 0, pendientes: 0, sinConexion: false };
    const porEnviar = (await colaDe(userId)).filter((i) => i.estado === 'pendiente');
    for (const item of porEnviar) {
      let resultado;
      try {
        await enviar({ ...item.body, clientUuid: item.clientUuid, capturadoEn: item.capturadoEn });
        resultado = { quitar: true };
      } catch (e) {
        const status = Number(e && e.status);
        if (esSinConexion(e) || status === 401 || status === 429 || status >= 500 || !status) {
          r.sinConexion = esSinConexion(e);
          break;
        }
        resultado = { error: mensajeApi(e) };
      }
      await enSerie(async () => {
        const d = await leer();
        if (resultado.quitar) d.cola = d.cola.filter((i) => i.clientUuid !== item.clientUuid);
        else d.cola = d.cola.map((i) => (i.clientUuid === item.clientUuid ? { ...i, estado: 'error', error: resultado.error } : i));
        await escribir(d);
      });
      if (resultado.quitar) r.enviados++; else r.rechazados++;
    }
    r.pendientes = (await colaDe(userId)).length;
    if (r.enviados || r.rechazados) avisar();
    return r;
  })().finally(() => { sincronizando = null; });
  return sincronizando;
}
