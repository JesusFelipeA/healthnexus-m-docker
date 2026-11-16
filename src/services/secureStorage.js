import * as Keychain from 'react-native-keychain';

// El token se guarda cifrado en el Keystore de Android, solo legible con el
// teléfono desbloqueado y sin copiarse a respaldos ni a otros equipos (HU-44).
const SERVICE = 'healthnexus.token';
const SOLO_ESTE_EQUIPO = () => Keychain.ACCESSIBLE && Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

export async function getToken() {
  try {
    const c = await Keychain.getGenericPassword({ service: SERVICE });
    return c ? c.password : null;
  } catch {
    return null;
  }
}

export async function saveToken(token) {
  await Keychain.setGenericPassword('token', token, {
    service: SERVICE,
    accessible: SOLO_ESTE_EQUIPO(),
  });
}

export async function clearToken() {
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    /* no había token guardado */
  }
}

const DEVICE_SERVICE = 'healthnexus.device';

export async function getDeviceFingerprint() {
  const credentials = await Keychain.getGenericPassword({
    service: DEVICE_SERVICE,
  });

  if (credentials?.password) {
    return credentials.password;
  }

  // Es un identificador, no un secreto de autenticación.
  const randomPart = () => Math.random().toString(36).slice(2);
  const fingerprint = `${Date.now()}-${randomPart()}${randomPart()}${randomPart()}${randomPart()}`;

  await Keychain.setGenericPassword('device', fingerprint, {
    service: DEVICE_SERVICE,
    accessible: SOLO_ESTE_EQUIPO(),
  });

  return fingerprint;
}

// Modo sin conexión: la sesión, la lista de pacientes y la cola de signos pendientes se guardan
// cifrados en el Keystore (mismas reglas que el token: solo este equipo, con el teléfono desbloqueado).
const OFFLINE_SERVICE = 'healthnexus.offline';

export async function leerOffline() {
  try {
    const c = await Keychain.getGenericPassword({ service: OFFLINE_SERVICE });
    return c && c.password ? JSON.parse(c.password) : null;
  } catch {
    return null;
  }
}

export async function guardarOffline(datos) {
  await Keychain.setGenericPassword('offline', JSON.stringify(datos), {
    service: OFFLINE_SERVICE,
    accessible: SOLO_ESTE_EQUIPO(),
  });
}
