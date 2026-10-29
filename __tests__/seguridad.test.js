// Actividad 07: pruebas de los mecanismos de seguridad del inicio de sesión
//   P01 Enviar campos vacíos            -> la aplicación rechaza la información
//   P02 Introducir datos inválidos      -> la aplicación muestra un mensaje controlado
//   P03 Consultar información autorizada -> el sistema permite la operación
//   P04 Acceder a información no autorizada -> el sistema rechaza la operación
//   P05 Conexión sin HTTPS (release)    -> la app no envía nada
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));

const { useAuth } = require('../src/context/AuthContext');
const Login = require('../src/screens/Login').default;
const { validarLogin, MENSAJES_VALIDACION, LIMITES } = require('../src/utils/validation');
const { mensajeLogin, MENSAJES_ERROR } = require('../src/utils/errors');

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 24, left: 0, right: 0, bottom: 34 } };
const render = (el) => {
  let r;
  act(() => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); });
  return r;
};
const texts = (r) => JSON.stringify(r.toJSON());
const campo = (r, placeholder) => r.root.findAll((n) => n.props.placeholder === placeholder && typeof n.props.onChangeText === 'function')[0];
const botonLogin = (r) => r.root.findAll((n) => n.props.accessibilityLabel === 'Iniciar sesión' && n.props.accessibilityRole === 'button')[0];
const escribir = (r, placeholder, valor) => act(() => campo(r, placeholder).props.onChangeText(valor));
const pulsar = async (r) => { await act(async () => { await botonLogin(r).props.onPress(); }); };

describe('Validación de entradas (funciones puras)', () => {
  test('rechaza campos vacíos', () => {
    expect(validarLogin({ email: '', password: '' })).toMatchObject({ ok: false, error: MENSAJES_VALIDACION.vacios });
    expect(validarLogin({ email: '   ', password: '' }).ok).toBe(false);
    expect(validarLogin({ email: 'a@b.com', password: '' }).error).toBe(MENSAJES_VALIDACION.passwordVacia);
    expect(validarLogin({ email: '', password: 'secreta' }).error).toBe(MENSAJES_VALIDACION.correoVacio);
    expect(validarLogin().ok).toBe(false);
  });

  test('rechaza correos con formato inválido', () => {
    ['sin-arroba', 'a@b', 'a b@c.com', '@dominio.com', 'usuario@', "' OR 1=1 --"].forEach((e) => {
      expect(validarLogin({ email: e, password: 'x' })).toMatchObject({ ok: false, error: MENSAJES_VALIDACION.correoInvalido });
    });
  });

  test('rechaza caracteres de control y longitudes excesivas', () => {
    expect(validarLogin({ email: 'a@b.com\u0000', password: 'x' }).error).toBe(MENSAJES_VALIDACION.caracteresInvalidos);
    expect(validarLogin({ email: 'a@b.com', password: 'x\ny' }).error).toBe(MENSAJES_VALIDACION.caracteresInvalidos);
    const largo = `${'a'.repeat(LIMITES.emailMax)}@b.com`;
    expect(validarLogin({ email: largo, password: 'x' }).error).toBe(MENSAJES_VALIDACION.correoLargo);
    expect(validarLogin({ email: 'a@b.com', password: 'p'.repeat(LIMITES.passwordMax + 1) }).error).toBe(MENSAJES_VALIDACION.passwordLarga);
  });

  test('acepta datos válidos y limpia el correo, sin tocar la contraseña', () => {
    expect(validarLogin({ email: '  Medico@Hospital.COM ', password: ' con espacios ' })).toEqual({
      ok: true,
      error: null,
      valores: { email: 'medico@hospital.com', password: ' con espacios ' },
    });
  });
});

describe('Manejo seguro de errores (funciones puras)', () => {
  test('traduce cada código a un mensaje controlado', () => {
    expect(mensajeLogin({ status: 0 })).toBe(MENSAJES_ERROR.sinConexion);
    expect(mensajeLogin({ status: 401 })).toBe(MENSAJES_ERROR.credenciales);
    expect(mensajeLogin({ status: 400 })).toBe(MENSAJES_ERROR.credenciales);
    expect(mensajeLogin({ status: 403 })).toBe(MENSAJES_ERROR.sinAcceso);
    expect(mensajeLogin({ status: 429 })).toBe(MENSAJES_ERROR.demasiadosIntentos);
    expect(mensajeLogin({ status: 500 })).toBe(MENSAJES_ERROR.servicio);
    expect(mensajeLogin({ status: 503 })).toBe(MENSAJES_ERROR.servicio);
    expect(mensajeLogin(new Error('boom'))).toBe(MENSAJES_ERROR.generico);
    expect(mensajeLogin(undefined)).toBe(MENSAJES_ERROR.generico);
  });

  test('nunca devuelve el texto crudo del servidor', () => {
    const crudo = "SQLSTATE[42S02]: Base table or view not found at /var/www/app/Http/AuthController.php:88";
    const salida = mensajeLogin({ status: 500, message: crudo });
    expect(salida).not.toContain('SQLSTATE');
    expect(salida).not.toContain('/var/www');
    expect(mensajeLogin({ status: 401, message: 'El usuario admin@hospital.com no existe' })).not.toContain('admin@hospital.com');
  });
});

describe('Pantalla de inicio de sesión', () => {
  let login;
  beforeEach(() => { jest.useFakeTimers(); login = jest.fn(); useAuth.mockReturnValue({ login }); });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  test('P01: con campos vacíos no se envía nada al servicio y se avisa al usuario', async () => {
    const r = render(<Login />);
    await pulsar(r);
    expect(login).not.toHaveBeenCalled();
    expect(texts(r)).toContain(MENSAJES_VALIDACION.vacios);
    act(() => r.unmount());
  });

  test('P02: con un correo inválido se muestra un mensaje controlado y no se envía nada', async () => {
    const r = render(<Login />);
    escribir(r, 'usuario@hospital.com', 'no-es-un-correo');
    escribir(r, '••••••••', 'cualquiera');
    await pulsar(r);
    expect(login).not.toHaveBeenCalled();
    expect(texts(r)).toContain(MENSAJES_VALIDACION.correoInvalido);
    act(() => r.unmount());
  });

  test('un error del servidor muestra un mensaje controlado y vacía la contraseña', async () => {
    login.mockRejectedValue(Object.assign(new Error('SQLSTATE[HY000] detalle interno'), { status: 500 }));
    const r = render(<Login />);
    escribir(r, 'usuario@hospital.com', 'medico@hospital.com');
    escribir(r, '••••••••', 'Clave-Segura-1');
    await pulsar(r);
    expect(login).toHaveBeenCalledWith('medico@hospital.com', 'Clave-Segura-1');
    expect(texts(r)).toContain(MENSAJES_ERROR.servicio);
    expect(texts(r)).not.toContain('SQLSTATE');
    expect(campo(r, '••••••••').props.value).toBe('');
    act(() => r.unmount());
  });

  test('los campos limitan la longitud que se puede escribir', () => {
    const r = render(<Login />);
    expect(campo(r, 'usuario@hospital.com').props.maxLength).toBe(LIMITES.emailMax);
    expect(campo(r, '••••••••').props.maxLength).toBe(LIMITES.passwordMax);
    act(() => r.unmount());
  });
});

describe('Cliente de la API', () => {
  const cargarCliente = (url, dev = true) => {
    let mod;
    global.__DEV__ = dev;
    jest.isolateModules(() => {
      jest.doMock('../src/config', () => ({ API_URL: url }));
      mod = require('../src/api/client');
    });
    return mod;
  };
  afterEach(() => { global.__DEV__ = true; delete global.fetch; });

  test('P03: con sesión válida el sistema permite la operación y envía el token', async () => {
    const { http, setAuthToken } = cargarCliente('https://servidor.test/api');
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 1, name: 'Paciente de prueba' }] });
    setAuthToken('token-valido');
    const datos = await http.get('/patients');
    expect(datos).toEqual([{ id: 1, name: 'Paciente de prueba' }]);
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-valido');
  });

  test('P04: un acceso no autorizado es rechazado y cierra la sesión si el token ya no vale', async () => {
    const { http, setAuthToken, setUnauthorizedHandler, ApiError } = cargarCliente('https://servidor.test/api');
    const alCerrar = jest.fn();
    setUnauthorizedHandler(alCerrar);
    setAuthToken('token-vencido');

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Sesión inválida' }) });
    await expect(http.get('/patients')).rejects.toBeInstanceOf(ApiError);
    expect(alCerrar).toHaveBeenCalledTimes(1);

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'Sin permiso' }) });
    await expect(http.get('/auditoria')).rejects.toMatchObject({ status: 403 });
  });

  test('P05: en la versión release una URL sin HTTPS se bloquea antes de enviar nada', async () => {
    const { http, ApiError } = cargarCliente('http://servidor.test/api', false);
    global.fetch = jest.fn();
    await expect(http.post('/auth/login', { email: 'a@b.com', password: 'x' })).rejects.toBeInstanceOf(ApiError);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mensajeLogin(await http.get('/x').catch((e) => e))).toBe(MENSAJES_ERROR.conexionInsegura);
  });

  test('en desarrollo se permite HTTP (emulador y red local)', async () => {
    const { http } = cargarCliente('http://192.168.1.8:3000/api', true);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await expect(http.get('/health')).resolves.toEqual({ ok: true });
  });
});
