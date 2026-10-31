import { API_URL } from '../config';

let token = null;
let onUnauthorized = null;

export const setAuthToken = t => {
  token = t;
};
export const setUnauthorizedHandler = fn => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    // Código fijo que manda la API en algunos errores (p. ej. CODIGO_BLOQUEADO, SESION_REVOCADA)
    if (code) this.code = code;
  }
}

// Seguridad: en la versión release solo se permite HTTPS. Si la URL no es
// segura, no se envía nada (ni credenciales ni token).
export function verificarTransporte() {
  if (!__DEV__ && !API_URL.startsWith('https://')) {
    const e = new ApiError(0, 'Conexión no segura bloqueada.');
    e.code = 'INSECURE_TRANSPORT';
    throw e;
  }
}

// Para descargas de archivos (PDF), que no pasan por fetch/JSON
export const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});
export const notificarNoAutorizado = () => {
  if (token && onUnauthorized) onUnauthorized();
};

async function request(method, path, body, extraHeaders = {}) {
  verificarTransporte();

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Revisa tu conexión.',
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin cuerpo */
  }

  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError(
      res.status,
      (data && data.error) || `Error ${res.status}`,
      data && typeof data.code === 'string' ? data.code : undefined,
    );
  }
  return data;
}

export const http = {
  get: path => request('GET', path),
  post: (path, body, headers = {}) =>
    request('POST', path, body ?? {}, headers),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  del: (path, headers = {}) => request('DELETE', path, undefined, headers),
};
