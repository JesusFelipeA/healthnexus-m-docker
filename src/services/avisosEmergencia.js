// Aviso interno "cambiaron las emergencias": lo emiten la notificación push y el botón de
// emergencia, y lo escucha el Dashboard para recargar la lista sin esperar a la siguiente consulta.
const oyentes = new Set();

/** Suscribe una función; devuelve la función para quitar la suscripción. */
export function alCambiarEmergencias(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Avisa a todos los suscriptores. Un error en uno no afecta a los demás. */
export function avisarCambioEmergencias() {
  oyentes.forEach((fn) => {
    try { fn(); } catch { /* un oyente con error no detiene a los demás */ }
  });
}
