// Formatos cortos para el Dashboard (sin depender de Intl, que varía entre motores de JS).
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "Buenos días" de 5:00 a 11:59, "Buenas tardes" de 12:00 a 18:59 y "Buenas noches" el resto. */
export function saludo(fecha = new Date()) {
  const h = fecha.getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "Jue 29 oct" */
export const fechaCorta = (fecha = new Date()) => `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]}`;

/** "07:05" */
export const horaMinutos = (fecha = new Date()) => `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;

/** Primer nombre para el saludo, sin títulos ("Dr. Luis Romero" -> "Luis") */
export function primerNombre(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter((p) => !/^(dr|dra|enf|lic|ing|mtro|mtra)\.?$/i.test(p));
  return partes[0] || 'Usuario';
}

/** Iniciales para el avatar: nombre + primer apellido ("Jorge Castillo Peña" -> "JC") */
export function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter((p) => p && !/^(dr|dra|enf|lic|ing|mtro|mtra)\.?$/i.test(p));
  if (partes.length === 0) return 'U';
  return (partes[0][0] + (partes.length > 1 ? partes[1][0] : '')).toUpperCase();
}
