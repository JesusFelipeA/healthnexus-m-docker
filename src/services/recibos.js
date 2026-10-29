// Descarga y comparte el recibo de pago en PDF (HU-75).
// El PDF lo genera la API (GET /pagos/:id/recibo); aquí solo se baja con el token y se entrega al usuario.
import { Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { API_URL } from '../config';
import { ApiError, authHeaders, notificarNoAutorizado, verificarTransporte } from '../api/client';

const limpiar = (folio) => String(folio || 'recibo').replace(/[^A-Za-z0-9_-]/g, '');

// Baja el PDF a la carpeta privada (caché) de la app y devuelve su ruta.
export async function descargarReciboTemporal(pagoId, folio) {
  verificarTransporte();
  const ruta = `${RNBlobUtil.fs.dirs.CacheDir}/recibo-${limpiar(folio)}.pdf`;
  let resp;
  try {
    resp = await RNBlobUtil.config({ fileCache: true, path: ruta }).fetch('GET', `${API_URL}/pagos/${pagoId}/recibo`, authHeaders());
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.');
  }
  const status = resp.info().status;
  if (status !== 200) {
    // La API responde JSON con { error } cuando falla
    let mensaje = `Error ${status}`;
    try { mensaje = JSON.parse(await resp.text()).error || mensaje; } catch { /* sin cuerpo */ }
    try { await RNBlobUtil.fs.unlink(resp.path()); } catch { /* ya no existe */ }
    if (status === 401) notificarNoAutorizado();
    throw new ApiError(status, mensaje);
  }
  return resp.path();
}

// Guarda una copia en Descargas (Android) y avisa dónde quedó.
export async function guardarRecibo(pagoId, folio) {
  if (Platform.OS !== 'android') throw new ApiError(0, 'Guardar el recibo solo está disponible en Android. Usa Compartir.');
  const ruta = await descargarReciboTemporal(pagoId, folio);
  const nombre = `recibo-${limpiar(folio)}.pdf`;
  try {
    await RNBlobUtil.MediaCollection.copyToMediaStore({ name: nombre, parentFolder: '', mimeType: 'application/pdf' }, 'Download', ruta);
    return { nombre, lugar: 'la carpeta Descargas' };
  } finally {
    try { await RNBlobUtil.fs.unlink(ruta); } catch { /* ya no existe */ }
  }
}

// Abre el menú de compartir (WhatsApp, correo, etc.) con el PDF adjunto.
export async function compartirRecibo(pagoId, folio) {
  const ruta = await descargarReciboTemporal(pagoId, folio);
  try {
    await Share.open({
      url: `file://${ruta}`, type: 'application/pdf', filename: `recibo-${limpiar(folio)}`,
      title: `Recibo ${folio}`, failOnCancel: false,
    });
  } finally {
    try { await RNBlobUtil.fs.unlink(ruta); } catch { /* ya no existe */ }
  }
}
