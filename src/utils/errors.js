// Manejo seguro de errores (Actividad 07).
// La app nunca muestra al usuario el texto crudo que devuelve el servidor
// (puede traer detalles técnicos o ayudar a enumerar cuentas). Cada error se
// traduce a un mensaje controlado según su código HTTP.

export const MENSAJES_ERROR = {
  sinConexion: 'No se pudo conectar con el servidor. Revisa tu conexión.',
  credenciales: 'Correo o contraseña incorrectos.',
  sinAcceso: 'Tu cuenta no tiene acceso. Contacta al administrador.',
  demasiadosIntentos: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  servicio: 'El servicio no está disponible por ahora. Inténtalo más tarde.',
  conexionInsegura: 'Conexión no segura bloqueada. Contacta al administrador.',
  generico: 'No fue posible iniciar sesión.',
  dispositivoBloqueado: 'Este teléfono está bloqueado. Pide al administrador que lo desbloquee en Dispositivos.',
};

// La API marca el rechazo de un dispositivo bloqueado con un mensaje fijo que menciona "bloqueado"
const esDispositivoBloqueado = (error) => Number(error && error.status) === 403 && /bloquead/i.test(String((error && error.message) || ''));

/** Devuelve el mensaje que se puede mostrar al usuario para un error de login. */
export function mensajeLogin(error) {
  const status = Number(error && error.status);

  if (error && error.code === 'INSECURE_TRANSPORT') return MENSAJES_ERROR.conexionInsegura;
  if (status === 0) return MENSAJES_ERROR.sinConexion;
  if (status === 400 || status === 401) return MENSAJES_ERROR.credenciales;
  if (esDispositivoBloqueado(error)) return MENSAJES_ERROR.dispositivoBloqueado;
  if (status === 403) return MENSAJES_ERROR.sinAcceso;
  if (status === 429) return MENSAJES_ERROR.demasiadosIntentos;
  if (status >= 500) return MENSAJES_ERROR.servicio;
  return MENSAJES_ERROR.generico;
}

// Segundo paso del médico (POST /auth/pin)
export const MENSAJES_ERROR_PIN = {
  incorrecto: 'PIN incorrecto.',
  expirado: 'La verificación expiró. Inicia sesión de nuevo.',
  sinPin: 'Tu cuenta no tiene PIN asignado. Pide al administrador que lo genere.',
};

/**
 * Mensaje controlado para un error al verificar el PIN.
 * `expirado: true` indica que hay que volver a pedir correo y contraseña.
 */
export function mensajePin(error) {
  const status = Number(error && error.status);
  if (error && error.code === 'INSECURE_TRANSPORT') return { mensaje: MENSAJES_ERROR.conexionInsegura, expirado: false };
  if (status === 0) return { mensaje: MENSAJES_ERROR.sinConexion, expirado: false };
  if (status === 401) {
    // La API distingue el PIN incorrecto del pinToken vencido; aquí solo se elige entre dos textos fijos.
    const expirado = /expir/i.test(String((error && error.message) || ''));
    return { mensaje: expirado ? MENSAJES_ERROR_PIN.expirado : MENSAJES_ERROR_PIN.incorrecto, expirado };
  }
  if (status === 400) return { mensaje: MENSAJES_ERROR_PIN.expirado, expirado: true };
  if (esDispositivoBloqueado(error)) return { mensaje: MENSAJES_ERROR.dispositivoBloqueado, expirado: true };
  if (status === 403) return { mensaje: MENSAJES_ERROR_PIN.sinPin, expirado: true };
  if (status === 429) return { mensaje: MENSAJES_ERROR.demasiadosIntentos, expirado: false };
  if (status >= 500) return { mensaje: MENSAJES_ERROR.servicio, expirado: false };
  return { mensaje: MENSAJES_ERROR.generico, expirado: false };
}

/** Mensaje controlado para cualquier error de la API fuera del login. */
export function mensajeApi(error) {
  if (error && error.code === 'INSECURE_TRANSPORT') return MENSAJES_ERROR.conexionInsegura;
  const status = Number(error && error.status);
  if (status === 0) return MENSAJES_ERROR.sinConexion;
  if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
  if (status === 403) return 'Tu rol no tiene permiso para esta acción.';
  if (status === 429) return 'Demasiadas peticiones. Espera un momento.';
  if (status >= 500) return MENSAJES_ERROR.servicio;
  if ([400, 404, 409, 413].includes(status) && error.message) return error.message;
  return 'No fue posible completar la operación.';
}
