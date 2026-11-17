// Cómo se acomoda el contenido según el tamaño de la pantalla (celular, tablet, horizontal).
// Funciones puras para poder probarlas sin dispositivo; el hook useDisposicion las conecta
// con el tamaño real de la ventana (cambia al girar el teléfono o en pantalla dividida).

/** Ancho máximo de formularios, detalles y textos: más ancho que esto cuesta leerlo. */
export const ANCHO_LECTURA = 720;
/** Ancho máximo de las listas de tarjetas en pantallas grandes (caben 2 columnas). */
export const ANCHO_AMPLIO = 1100;
/** Ancho máximo de las tarjetas de inicio de sesión y recuperar contraseña. */
export const ANCHO_TARJETA = 480;
/** Margen lateral del contenido (igual al padding de Screen). */
export const MARGEN = 20;
/** Separación entre columnas de la rejilla. */
export const SEPARACION = 12;
/** Una tarjeta más angosta que esto se ve apretada: por debajo se queda en 1 columna. */
export const ANCHO_MIN_COLUMNA = 340;
/** Android considera "pantalla grande" (tablet, plegable abierto) un lado corto de 600 dp o más. */
export const LADO_CORTO_TABLET = 600;
/**
 * Tope de crecimiento de la letra del sistema en elementos de altura compacta
 * (chips, insignias, títulos de encabezado). El resto del texto crece sin límite.
 */
export const LETRA_COMPACTA = 1.4;

/**
 * @param {{ width?: number, height?: number }} ventana  tamaño de la ventana en dp
 * @param {{ amplio?: boolean }} opciones  amplio: listas que pueden ir a 2 columnas
 */
export function disposicion(ventana = {}, { amplio = false } = {}) {
  const width = Number(ventana.width) || 0;
  const height = Number(ventana.height) || 0;
  const anchoMaximo = amplio ? ANCHO_AMPLIO : ANCHO_LECTURA;
  const anchoContenido = Math.max(0, Math.min(width, anchoMaximo) - MARGEN * 2);
  const caben = Math.floor((anchoContenido + SEPARACION) / (ANCHO_MIN_COLUMNA + SEPARACION));
  const columnas = amplio ? Math.max(1, Math.min(2, caben)) : 1;
  const anchoColumna = columnas > 1
    ? Math.floor((anchoContenido - SEPARACION * (columnas - 1)) / columnas)
    : anchoContenido;
  return {
    esTablet: Math.min(width, height) >= LADO_CORTO_TABLET,
    horizontal: width > height,
    anchoMaximo,
    anchoContenido,
    columnas,
    anchoColumna,
  };
}

/** Estilo del contenedor del contenido: ocupa todo en celular y se centra en pantallas grandes. */
export function estiloCentrado(anchoMaximo) {
  return { width: '100%', maxWidth: anchoMaximo, alignSelf: 'center' };
}

/** Reparte una lista en filas de `columnas` elementos (la última puede quedar incompleta). */
export function enFilas(elementos, columnas) {
  const n = Math.max(1, Math.floor(columnas) || 1);
  const filas = [];
  for (let i = 0; i < elementos.length; i += n) filas.push(elementos.slice(i, i + n));
  return filas;
}
