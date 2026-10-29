// Utilidades para mostrar las emergencias activas del Dashboard.
// La API entrega la hora en formato 'YYYY-MM-DD HH:mm:ss' con la hora local de México
// (la misma que guarda la web), así que se interpreta como hora local del teléfono.

/** Convierte 'YYYY-MM-DD HH:mm:ss' en Date local, o null si no es válida. */
export function leerFecha(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(texto || ''));
  if (!m) return null;
  const [, a, mes, d, h, min, s] = m.map(Number);
  const f = new Date(a, mes - 1, d, h, min, s || 0);
  return Number.isNaN(f.getTime()) ? null : f;
}

/** '21:05' a partir de la fecha de la API. */
export function horaCorta(texto) {
  const f = leerFecha(texto);
  if (!f) return '';
  return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
}

/** 'hace un momento', 'hace 5 min', 'hace 2 h'. */
export function tiempoTranscurrido(texto, ahora = new Date()) {
  const f = leerFecha(texto);
  if (!f) return '';
  const min = Math.floor((ahora.getTime() - f.getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h`;
}

/** Enlace que abre la ubicación en la app de mapas, o null si no hay coordenadas válidas. */
export function urlMapa(ubicacion) {
  if (!ubicacion) return null;
  const lat = Number(ubicacion.lat);
  const lng = Number(ubicacion.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
