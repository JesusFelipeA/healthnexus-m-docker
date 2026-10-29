// Notificaciones push con Firebase Cloud Messaging.
//
// - Al iniciar sesión: pide permiso (Android 13+), obtiene el token del teléfono y lo registra en la API
//   junto con la huella del dispositivo. Si el token cambia, lo vuelve a registrar.
// - Con la app abierta: muestra un aviso dentro de la app.
// - Al tocar una notificación: abre la pantalla indicada en `data.pantalla`.
// - Al cerrar sesión: borra el token en la API y en el teléfono, para que no lleguen más avisos.
//
// Si Firebase no está configurado (falta android/app/google-services.json), todo esto se omite
// sin errores y la app funciona igual.
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import * as api from '../api';
import { getDeviceFingerprint } from './secureStorage';
import { avisarCambioEmergencias } from './avisosEmergencia';

// Pantallas a las que puede llevar una notificación (no se navega a nada fuera de esta lista).
export const PANTALLAS_PERMITIDAS = ['Dashboard', 'Triage', 'Patients', 'AlertasFarmacia', 'Internas', 'Externas'];

let modulo; // módulo de @react-native-firebase/messaging, o null si no está disponible
function fcm() {
  if (modulo !== undefined) return modulo;
  try {
    // eslint-disable-next-line global-require
    const m = require('@react-native-firebase/messaging');
    m.getMessaging(); // lanza si falta google-services.json
    modulo = m;
  } catch {
    modulo = null;
  }
  return modulo;
}

// Solo para pruebas
export function _reiniciar(m) {
  modulo = m;
  desuscribir();
}

let suscripciones = [];
function desuscribir() {
  suscripciones.forEach((quitar) => {
    try { quitar(); } catch { /* ya no estaba suscrito */ }
  });
  suscripciones = [];
}

export const pushDisponible = () => !!fcm();

async function pedirPermiso(m) {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      return r === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  const estado = await m.requestPermission(m.getMessaging());
  return estado === m.AuthorizationStatus.AUTHORIZED || estado === m.AuthorizationStatus.PROVISIONAL;
}

async function registrar(token) {
  const huella = await getDeviceFingerprint();
  await api.registrarTokenPush(token, huella);
}

// Una emergencia nueva hace que el Dashboard recargue su lista de emergencias activas
function avisarSiEsEmergencia(msg) {
  if (msg && msg.data && msg.data.tipo === 'emergencia') avisarCambioEmergencias();
}

function abrir(remoteMessage, navegar) {
  avisarSiEsEmergencia(remoteMessage);
  const pantalla = remoteMessage && remoteMessage.data && remoteMessage.data.pantalla;
  if (pantalla && PANTALLAS_PERMITIDAS.includes(pantalla)) navegar(pantalla);
}

/**
 * Activa las notificaciones para la sesión actual.
 * @param {(pantalla: string) => void} navegar  abre una pantalla de la app
 * @returns {Promise<boolean>} true si quedaron activas
 */
export async function iniciarPush(navegar) {
  const m = fcm();
  if (!m) return false;
  desuscribir();
  try {
    if (!(await pedirPermiso(m))) return false;
    const messaging = m.getMessaging();
    await registrar(await m.getToken(messaging));

    suscripciones.push(m.onTokenRefresh(messaging, (nuevo) => registrar(nuevo).catch(() => {})));
    suscripciones.push(m.onMessage(messaging, (msg) => {
      avisarSiEsEmergencia(msg);
      const n = msg.notification || {};
      if (!n.title) return;
      const botones = msg.data && PANTALLAS_PERMITIDAS.includes(msg.data.pantalla)
        ? [{ text: 'Cerrar', style: 'cancel' }, { text: 'Ver', onPress: () => abrir(msg, navegar) }]
        : [{ text: 'Entendido' }];
      Alert.alert(n.title, n.body || '', botones);
    }));
    suscripciones.push(m.onNotificationOpenedApp(messaging, (msg) => abrir(msg, navegar)));
    // La app estaba cerrada y se abrió tocando la notificación
    const inicial = await m.getInitialNotification(messaging);
    if (inicial) abrir(inicial, navegar);
    return true;
  } catch {
    return false;
  }
}

/** Deja de recibir notificaciones en este teléfono (al cerrar sesión). */
let deteniendo = false;
export async function detenerPush() {
  desuscribir();
  const m = fcm();
  // Evita un ciclo: si la sesión ya venció, la API responde 401 y la app vuelve a cerrar sesión.
  if (!m || deteniendo) return;
  deteniendo = true;
  try {
    const huella = await getDeviceFingerprint();
    await api.quitarTokenPush(huella);
  } catch {
    /* la sesión pudo haber vencido: igual se borra el token local */
  }
  try {
    await m.deleteToken(m.getMessaging());
  } catch {
    /* sin token que borrar */
  } finally {
    deteniendo = false;
  }
}

/** Se llama en index.js: los mensajes que llegan con la app cerrada los muestra Android. */
export function registrarSegundoPlano() {
  const m = fcm();
  if (!m) return;
  m.setBackgroundMessageHandler(m.getMessaging(), async () => {});
}
