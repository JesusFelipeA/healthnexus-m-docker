// Recuperación de contraseña: reglas y mensajes (funciones puras, se prueban con Jest).
// Las reglas son las mismas que exige la API (src/routes/recuperacion.js) y la web.
import { MENSAJES_ERROR } from './errors';

export const CODIGO_LONGITUD = 6;
export const SEGUNDOS_REENVIO = 60;
export const MINUTOS_CODIGO = 15;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const correoValido = (email) => EMAIL_REGEX.test(String(email || '').trim());
export const normalizarCorreo = (email) => String(email || '').trim().toLowerCase();
export const soloDigitos = (texto, max = CODIGO_LONGITUD) => String(texto || '').replace(/\D/g, '').slice(0, max);

// "ana.lopez@hospital.mx" -> "a•••z@hospital.mx": confirma el destino sin mostrar el correo completo
export function enmascararCorreo(email) {
  const [usuario, dominio] = normalizarCorreo(email).split('@');
  if (!usuario || !dominio) return '';
  if (usuario.length <= 2) return `${usuario[0]}•••@${dominio}`;
  return `${usuario[0]}•••${usuario[usuario.length - 1]}@${dominio}`;
}

export function reglasClave(nueva = '', confirmar = '') {
  return [
    { id: 'largo', texto: 'Al menos 8 caracteres', ok: nueva.length >= 8 },
    { id: 'mayuscula', texto: 'Una letra mayúscula', ok: /[A-ZÁÉÍÓÚÑ]/.test(nueva) },
    { id: 'numero', texto: 'Un número', ok: /\d/.test(nueva) },
    { id: 'coinciden', texto: 'Las dos contraseñas coinciden', ok: nueva.length > 0 && nueva === confirmar },
  ];
}
// bcrypt solo usa los primeros 72 bytes: la API rechaza contraseñas más largas
export const bytesUtf8 = (s) => Array.from(String(s || '')).reduce((n, ch) => {
  const cp = ch.codePointAt(0);
  return n + (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);
}, 0);
const bytes = bytesUtf8;
export const claveValida = (nueva, confirmar) => reglasClave(nueva, confirmar).every((r) => r.ok) && bytes(nueva) <= 72;

export const formatoCuenta = (segundos) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;

export const MENSAJES_RECUPERACION = {
  correoInvalido: 'Escribe un correo electrónico válido.',
  muchasSolicitudes: 'Ya pediste varios códigos. Espera una hora o usa el último que te llegó.',
  codigoIncompleto: 'Escribe los 6 dígitos del código.',
  codigoInvalido: 'El código no es válido o ya venció.',
  codigoBloqueado: 'Demasiados intentos con este código. Pide uno nuevo.',
  expirado: 'La verificación expiró. Pide un código nuevo.',
  claveDebil: 'La contraseña no cumple los requisitos.',
  claveLarga: 'La contraseña es demasiado larga.',
};

// Mensaje controlado para cada paso. `reiniciar: true` = volver a pedir el correo.
export function mensajeRecuperacion(error, paso) {
  const status = Number(error && error.status);
  const code = error && error.code;
  if (code === 'INSECURE_TRANSPORT') return { mensaje: MENSAJES_ERROR.conexionInsegura };
  if (status === 0) return { mensaje: MENSAJES_ERROR.sinConexion };
  if (status === 429) return { mensaje: paso === 'correo' ? MENSAJES_RECUPERACION.muchasSolicitudes : MENSAJES_ERROR.demasiadosIntentos };
  if (status >= 500) return { mensaje: MENSAJES_ERROR.servicio };
  if (paso === 'correo' && status === 400) return { mensaje: MENSAJES_RECUPERACION.correoInvalido };
  if (paso === 'codigo' && status === 400) {
    return code === 'CODIGO_BLOQUEADO'
      ? { mensaje: MENSAJES_RECUPERACION.codigoBloqueado, bloqueado: true }
      : { mensaje: MENSAJES_RECUPERACION.codigoInvalido };
  }
  if (paso === 'clave' && status === 401) return { mensaje: MENSAJES_RECUPERACION.expirado, reiniciar: true };
  if (paso === 'clave' && status === 400) return { mensaje: MENSAJES_RECUPERACION.claveDebil };
  return { mensaje: 'No fue posible completar la operación.' };
}
