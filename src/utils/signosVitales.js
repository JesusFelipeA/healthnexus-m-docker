// Validación de signos vitales (HU-40). Funciones puras para poder probarlas con Jest.
//  - LIMITES: valores físicamente posibles (los mismos que acepta la API). Fuera de ellos no se envía nada.
//  - RANGOS_NORMALES: referencia para un adulto en reposo. Fuera de ellos se avisa y se pide confirmar.

export const LIMITES = {
  temperatura: { min: 25, max: 45, nombre: 'Temperatura', unidad: '°C' },
  frecuenciaCardiaca: { min: 10, max: 300, nombre: 'Frecuencia cardiaca', unidad: 'lpm', entero: true },
  frecuenciaRespiratoria: { min: 3, max: 100, nombre: 'Frecuencia respiratoria', unidad: 'rpm', entero: true },
  saturacionOxigeno: { min: 30, max: 100, nombre: 'Saturación de oxígeno', unidad: '%', entero: true },
  glucosa: { min: 10, max: 1500, nombre: 'Glucosa', unidad: 'mg/dL', entero: true },
  peso: { min: 0.3, max: 500, nombre: 'Peso', unidad: 'kg' },
  talla: { min: 0.2, max: 2.6, nombre: 'Talla', unidad: 'm' },
  escalaDolor: { min: 0, max: 10, nombre: 'Escala de dolor', unidad: '/10', entero: true },
};

export const RANGOS_NORMALES = {
  temperatura: { min: 36.1, max: 37.5 },
  frecuenciaCardiaca: { min: 60, max: 100 },
  frecuenciaRespiratoria: { min: 12, max: 20 },
  saturacionOxigeno: { min: 95, max: 100 },
  glucosa: { min: 70, max: 140 },
  sistolica: { min: 90, max: 139 },
  diastolica: { min: 60, max: 89 },
};

const PRESION_RE = /^(\d{2,3})\/(\d{2,3})$/;
const fuera = (v, r) => v < r.min || v > r.max;
const rangoTexto = (r, unidad = '') => `${r.min}–${r.max}${unidad ? ` ${unidad}` : ''}`;

/**
 * Revisa el cuerpo que se enviará a POST /enfermeria/signos.
 * Devuelve { error, avisos }:
 *  - error: texto que impide guardar (valor imposible, formato o nada capturado), o null.
 *  - avisos: lista de valores fuera del rango normal (se guardan solo si el usuario confirma).
 */
export function revisarSignos(body = {}) {
  const capturados = Object.keys(LIMITES).filter(k => body[k] !== undefined && body[k] !== null);
  const presion = typeof body.presionArterial === 'string' ? body.presionArterial.trim() : '';
  if (capturados.length === 0 && !presion) return { error: 'Registra al menos un signo vital.', avisos: [] };

  for (const k of capturados) {
    const v = body[k];
    const l = LIMITES[k];
    if (typeof v !== 'number' || Number.isNaN(v)) return { error: `${l.nombre}: escribe solo números.`, avisos: [] };
    if (l.entero && !Number.isInteger(v)) return { error: `${l.nombre} debe ser un número entero.`, avisos: [] };
    if (fuera(v, l)) return { error: `${l.nombre} fuera de lo posible (${rangoTexto(l, l.unidad)}). Revisa el valor.`, avisos: [] };
  }

  let sis = null;
  let dia = null;
  if (presion) {
    const m = PRESION_RE.exec(presion);
    if (!m) return { error: 'Presión arterial inválida. Usa el formato 120/80.', avisos: [] };
    sis = Number(m[1]);
    dia = Number(m[2]);
    if (dia >= sis) return { error: 'Presión arterial inválida: la diastólica debe ser menor que la sistólica.', avisos: [] };
  }

  const avisos = [];
  for (const k of capturados) {
    const r = RANGOS_NORMALES[k];
    if (r && fuera(body[k], r)) {
      avisos.push(`${LIMITES[k].nombre}: ${body[k]} ${LIMITES[k].unidad} (normal ${rangoTexto(r, LIMITES[k].unidad)})`);
    }
  }
  if (presion && (fuera(sis, RANGOS_NORMALES.sistolica) || fuera(dia, RANGOS_NORMALES.diastolica))) {
    avisos.push(`Presión arterial: ${presion} mmHg (normal ${rangoTexto(RANGOS_NORMALES.sistolica)}/${rangoTexto(RANGOS_NORMALES.diastolica)} mmHg)`);
  }
  return { error: null, avisos };
}

/** true si un valor ya registrado está fuera del rango normal (para resaltarlo en la lista). */
export function esAnormal(clave, valor) {
  if (valor === null || valor === undefined || valor === '') return false;
  if (clave === 'presionArterial') {
    const m = PRESION_RE.exec(String(valor).trim());
    if (!m) return false;
    return fuera(Number(m[1]), RANGOS_NORMALES.sistolica) || fuera(Number(m[2]), RANGOS_NORMALES.diastolica);
  }
  const r = RANGOS_NORMALES[clave];
  const n = Number(valor);
  return !!r && Number.isFinite(n) && fuera(n, r);
}
