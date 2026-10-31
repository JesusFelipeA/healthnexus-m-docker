import * as Keychain from 'react-native-keychain';

// Preferencias locales del teléfono (no son secretos). Se guardan con react-native-keychain
// para no agregar otra dependencia nativa; si el almacén no está disponible, se usa el valor por defecto.
const SERVICIO = 'healthnexus.preferencias.tema';
export const TEMAS = ['auto', 'claro', 'oscuro'];

export async function leerTema() {
  try {
    if (typeof Keychain.getGenericPassword !== 'function') return null;
    const c = await Keychain.getGenericPassword({ service: SERVICIO });
    return c && TEMAS.includes(c.password) ? c.password : null;
  } catch {
    return null;
  }
}

export async function guardarTema(tema) {
  if (!TEMAS.includes(tema)) return;
  try {
    if (typeof Keychain.setGenericPassword !== 'function') return;
    await Keychain.setGenericPassword('tema', tema, { service: SERVICIO });
  } catch {
    /* si no se puede guardar, la app sigue con el tema elegido hasta cerrarla */
  }
}
