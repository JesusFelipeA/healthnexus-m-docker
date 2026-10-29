import { mensajeApi, MENSAJES_ERROR } from '../src/utils/errors';

const err = (status, message = 'detalle') => Object.assign(new Error(message), { status });

describe('mensajeApi', () => {
  test('sin conexión', () => expect(mensajeApi(err(0))).toBe(MENSAJES_ERROR.sinConexion));
  test('403 rol sin permiso', () => expect(mensajeApi(err(403, 'x'))).toBe('Tu rol no tiene permiso para esta acción.'));
  test('429 demasiadas peticiones', () => expect(mensajeApi(err(429))).toBe('Demasiadas peticiones. Espera un momento.'));
  test('5xx no filtra el texto del servidor', () => {
    const m = mensajeApi(err(500, 'SQLSTATE[HY000]'));
    expect(m).toBe(MENSAJES_ERROR.servicio);
    expect(m).not.toContain('SQLSTATE');
  });
  test('400/404/409 muestran el mensaje de la API', () => {
    expect(mensajeApi(err(400, 'Ubicación inválida'))).toBe('Ubicación inválida');
    expect(mensajeApi(err(409, 'El paciente ya fue derivado a otro hospital'))).toBe('El paciente ya fue derivado a otro hospital');
  });
  test('error desconocido', () => expect(mensajeApi(new Error('boom'))).toBe('No fue posible completar la operación.'));
});

// Dispositivo bloqueado desde la web (Dispositivos → Bloquear)
test('un 403 por dispositivo bloqueado muestra su propio mensaje; otro 403 sigue siendo "sin acceso"', () => {
  const { mensajeLogin, MENSAJES_ERROR } = require('../src/utils/errors');
  expect(mensajeLogin({ status: 403, message: 'Este dispositivo está bloqueado. Pide al administrador que lo desbloquee.' })).toBe(MENSAJES_ERROR.dispositivoBloqueado);
  expect(mensajeLogin({ status: 403, message: 'No tienes permiso' })).toBe(MENSAJES_ERROR.sinAcceso);
});
