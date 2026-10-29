// Validación de entradas del inicio de sesión (Actividad 07).
// Funciones puras, sin dependencias de React Native, para poder probarlas con Jest.

export const LIMITES = {
  emailMax: 254, // máximo de una dirección de correo según RFC 5321
  passwordMax: 128, // evita enviar cadenas enormes al servidor
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// eslint-disable-next-line no-control-regex
const CARACTERES_DE_CONTROL = /[\u0000-\u001F\u007F]/;

export const MENSAJES_VALIDACION = {
  vacios: 'Ingresa tu correo y contraseña.',
  correoVacio: 'Ingresa tu correo electrónico.',
  correoInvalido: 'Ingresa un correo electrónico válido.',
  correoLargo: 'El correo electrónico es demasiado largo.',
  passwordVacia: 'Ingresa tu contraseña.',
  passwordLarga: 'La contraseña es demasiado larga.',
  caracteresInvalidos: 'Los datos contienen caracteres no permitidos.',
};

/**
 * Valida los datos del login ANTES de enviarlos al servicio.
 * - El correo se limpia (trim) y se pasa a minúsculas.
 * - La contraseña NO se modifica (los espacios pueden ser parte de ella)
 *   y no se le exige una longitud mínima: eso se valida al crearla, no al entrar.
 * Devuelve { ok, error, valores }. `error` es un mensaje controlado, nunca un detalle técnico.
 */
export function validarLogin({ email, password } = {}) {
  const correo = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const clave = typeof password === 'string' ? password : '';

  if (!correo && !clave) return fallo(MENSAJES_VALIDACION.vacios);
  if (!correo) return fallo(MENSAJES_VALIDACION.correoVacio);
  if (!clave) return fallo(MENSAJES_VALIDACION.passwordVacia);

  if (CARACTERES_DE_CONTROL.test(correo) || CARACTERES_DE_CONTROL.test(clave)) {
    return fallo(MENSAJES_VALIDACION.caracteresInvalidos);
  }
  if (correo.length > LIMITES.emailMax) return fallo(MENSAJES_VALIDACION.correoLargo);
  if (!EMAIL_REGEX.test(correo)) return fallo(MENSAJES_VALIDACION.correoInvalido);
  if (clave.length > LIMITES.passwordMax) return fallo(MENSAJES_VALIDACION.passwordLarga);

  return { ok: true, error: null, valores: { email: correo, password: clave } };
}

function fallo(error) {
  return { ok: false, error, valores: null };
}

// PIN de seguridad del médico: exactamente 4 dígitos (igual que la web).
export const PIN_LONGITUD = 4;
export const MENSAJES_PIN = {
  vacio: 'Ingresa tu PIN de seguridad.',
  formato: 'El PIN debe tener exactamente 4 dígitos.',
};

export function validarPin(pin) {
  const valor = typeof pin === 'string' ? pin.trim() : '';
  if (!valor) return { ok: false, error: MENSAJES_PIN.vacio, valor: null };
  if (!/^\d{4}$/.test(valor)) return { ok: false, error: MENSAJES_PIN.formato, valor: null };
  return { ok: true, error: null, valor };
}
