// Notificaciones push: registro del token, permisos, avisos con la app abierta y cierre de sesión.
import { Alert, PermissionsAndroid, Platform } from 'react-native';

jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/api', () => ({
  registrarTokenPush: jest.fn(() => Promise.resolve({ ok: true })),
  quitarTokenPush: jest.fn(() => Promise.resolve({ ok: true })),
}));
jest.mock('../src/services/secureStorage', () => ({
  getDeviceFingerprint: jest.fn(() => Promise.resolve('huella-del-telefono-0001')),
}));

const api = require('../src/api');
const push = require('../src/services/push');

function fcmFalso() {
  const h = {};
  const m = {
    getMessaging: jest.fn(() => ({ app: 'default' })),
    getToken: jest.fn(() => Promise.resolve('token-fcm-1')),
    deleteToken: jest.fn(() => Promise.resolve()),
    onTokenRefresh: jest.fn((_, cb) => { h.refresh = cb; return jest.fn(); }),
    onMessage: jest.fn((_, cb) => { h.message = cb; return jest.fn(); }),
    onNotificationOpenedApp: jest.fn((_, cb) => { h.opened = cb; return jest.fn(); }),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    setBackgroundMessageHandler: jest.fn(),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
  };
  return { m, h };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
  Object.defineProperty(Platform, 'Version', { get: () => 34, configurable: true });
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

test('sin Firebase configurado no hace nada y no falla', async () => {
  push._reiniciar(null);
  await expect(push.iniciarPush(jest.fn())).resolves.toBe(false);
  await push.detenerPush();
  expect(api.registrarTokenPush).not.toHaveBeenCalled();
  expect(api.quitarTokenPush).not.toHaveBeenCalled();
});

test('si el usuario niega el permiso (Android 13+) no se registra ningún token', async () => {
  const { m } = fcmFalso();
  push._reiniciar(m);
  PermissionsAndroid.request.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  await expect(push.iniciarPush(jest.fn())).resolves.toBe(false);
  expect(m.getToken).not.toHaveBeenCalled();
  expect(api.registrarTokenPush).not.toHaveBeenCalled();
});

test('con permiso registra el token con la huella del dispositivo y lo actualiza si cambia', async () => {
  const { m, h } = fcmFalso();
  push._reiniciar(m);
  await expect(push.iniciarPush(jest.fn())).resolves.toBe(true);
  expect(PermissionsAndroid.request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  expect(api.registrarTokenPush).toHaveBeenCalledWith('token-fcm-1', 'huella-del-telefono-0001');
  await h.refresh('token-fcm-2');
  expect(api.registrarTokenPush).toHaveBeenLastCalledWith('token-fcm-2', 'huella-del-telefono-0001');
});

test('con la app abierta muestra un aviso y "Ver" abre solo pantallas permitidas', async () => {
  const { m, h } = fcmFalso();
  push._reiniciar(m);
  const navegar = jest.fn();
  await push.iniciarPush(navegar);

  h.message({ notification: { title: 'Código de emergencia activado', body: 'Abre HealthNexus' }, data: { pantalla: 'Dashboard' } });
  const [titulo, , botones] = Alert.alert.mock.calls[0];
  expect(titulo).toBe('Código de emergencia activado');
  botones.find((b) => b.text === 'Ver').onPress();
  expect(navegar).toHaveBeenCalledWith('Dashboard');

  navegar.mockClear();
  h.opened({ data: { pantalla: 'Cuentas' } }); // no está en la lista
  expect(navegar).not.toHaveBeenCalled();
});

test('al tocar la notificación abre la pantalla, también si la app estaba cerrada', async () => {
  const { m, h } = fcmFalso();
  m.getInitialNotification.mockResolvedValue({ data: { pantalla: 'Triage' } });
  push._reiniciar(m);
  const navegar = jest.fn();
  await push.iniciarPush(navegar);
  expect(navegar).toHaveBeenCalledWith('Triage');
  h.opened({ data: { pantalla: 'AlertasFarmacia' } });
  expect(navegar).toHaveBeenLastCalledWith('AlertasFarmacia');
});

test('al cerrar sesión borra el token en la API y en el teléfono, aunque la API falle', async () => {
  const { m } = fcmFalso();
  push._reiniciar(m);
  api.quitarTokenPush.mockRejectedValueOnce(new Error('401'));
  await push.detenerPush();
  expect(api.quitarTokenPush).toHaveBeenCalledWith('huella-del-telefono-0001');
  expect(m.deleteToken).toHaveBeenCalled();
});

test('registra el manejador de mensajes en segundo plano', () => {
  const { m } = fcmFalso();
  push._reiniciar(m);
  push.registrarSegundoPlano();
  expect(m.setBackgroundMessageHandler).toHaveBeenCalled();
});
