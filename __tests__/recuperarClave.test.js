// Recuperar contraseña: reglas, mensajes y las 4 pantallas (correo, código, contraseña nueva, listo).
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockNavigate = jest.fn();
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn(() => ({ login: jest.fn() })) }));
jest.mock('../src/api', () => ({
  recuperarClave: jest.fn(),
  verificarCodigo: jest.fn(),
  restablecerClave: jest.fn(),
}));

const api = require('../src/api');
const R = require('../src/utils/recuperacion');
const { MENSAJES_ERROR } = require('../src/utils/errors');
const RecuperarCorreo = require('../src/screens/recuperar/RecuperarCorreo').default;
const RecuperarCodigo = require('../src/screens/recuperar/RecuperarCodigo').default;
const RecuperarClave = require('../src/screens/recuperar/RecuperarClave').default;
const RecuperarListo = require('../src/screens/recuperar/RecuperarListo').default;
const Login = require('../src/screens/Login').default;

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const err = (status, code) => Object.assign(new Error('detalle técnico del servidor'), { status, code });
const nav = () => ({ navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() });
const texto = (r) => JSON.stringify(r.toJSON());
const porPlaceholder = (r, p) => r.root.findAll((n) => n.props.placeholder === p && typeof n.props.onChangeText === 'function')[0];
const porLabel = (r, l) => r.root.findAll((n) => n.props.accessibilityLabel === l && typeof n.props.onChangeText === 'function')[0];
const boton = (r, l) => r.root.findAll((n) => n.props.accessibilityLabel === l && typeof n.props.onPress === 'function')[0];
async function montar(el) {
  let r;
  await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); });
  return r;
}
const pulsar = (r, l) => act(async () => { await boton(r, l).props.onPress(); });

beforeEach(() => jest.clearAllMocks());

describe('reglas (utils/recuperacion)', () => {
  test('la contraseña nueva exige 8+ caracteres, mayúscula, número y que coincidan', () => {
    const estado = (n, c) => Object.fromEntries(R.reglasClave(n, c).map((x) => [x.id, x.ok]));
    expect(estado('', '')).toEqual({ largo: false, mayuscula: false, numero: false, coinciden: false });
    expect(estado('hospital', 'hospital')).toEqual({ largo: true, mayuscula: false, numero: false, coinciden: true });
    expect(estado('Hospital2', 'Hospital')).toEqual({ largo: true, mayuscula: true, numero: true, coinciden: false });
    expect(R.claveValida('Hospital2', 'Hospital2')).toBe(true);
    expect(R.claveValida('Ñandú2026', 'Ñandú2026')).toBe(true);
    expect(R.claveValida('A1' + 'é'.repeat(40), 'A1' + 'é'.repeat(40))).toBe(false); // más de 72 bytes
  });
  test('el correo se muestra enmascarado', () => {
    expect(R.enmascararCorreo('Ana.Lopez@Hospital.mx')).toBe('a•••z@hospital.mx');
    expect(R.enmascararCorreo('al@h.mx')).toBe('a•••@h.mx');
    expect(R.enmascararCorreo('sin-arroba')).toBe('');
  });
  test('ayudantes de formato', () => {
    expect(R.soloDigitos('12a3 4-56789')).toBe('123456');
    expect(R.formatoCuenta(60)).toBe('1:00');
    expect(R.formatoCuenta(9)).toBe('0:09');
    expect(R.bytesUtf8('añ😀')).toBe(1 + 2 + 4);
  });
  test('los mensajes de error son fijos: nunca el texto crudo del servidor', () => {
    expect(R.mensajeRecuperacion(err(0), 'correo').mensaje).toBe(MENSAJES_ERROR.sinConexion);
    expect(R.mensajeRecuperacion(err(429), 'correo').mensaje).toBe(R.MENSAJES_RECUPERACION.muchasSolicitudes);
    expect(R.mensajeRecuperacion(err(400, 'CODIGO_INVALIDO'), 'codigo').mensaje).toBe(R.MENSAJES_RECUPERACION.codigoInvalido);
    expect(R.mensajeRecuperacion(err(400, 'CODIGO_BLOQUEADO'), 'codigo')).toEqual({ mensaje: R.MENSAJES_RECUPERACION.codigoBloqueado, bloqueado: true });
    expect(R.mensajeRecuperacion(err(401, 'RESET_EXPIRADO'), 'clave')).toEqual({ mensaje: R.MENSAJES_RECUPERACION.expirado, reiniciar: true });
    expect(R.mensajeRecuperacion(err(500), 'clave').mensaje).toBe(MENSAJES_ERROR.servicio);
    ['correo', 'codigo', 'clave'].forEach((paso) => expect(R.mensajeRecuperacion(err(418), paso).mensaje).not.toContain('detalle técnico'));
  });
});

describe('Login → "¿La olvidaste?"', () => {
  test('abre la recuperación con el correo que ya se escribió', async () => {
    jest.useFakeTimers();
    const r = await montar(<Login />);
    act(() => porPlaceholder(r, 'usuario@hospital.mx').props.onChangeText('  ana@hospital.mx '));
    act(() => boton(r, '¿Olvidaste tu contraseña?').props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('RecuperarCorreo', { email: 'ana@hospital.mx' });
    act(() => r.unmount());
    jest.useRealTimers();
  });
});

describe('Paso 1: correo', () => {
  test('valida el formato antes de llamar a la API', async () => {
    const n = nav();
    const r = await montar(<RecuperarCorreo navigation={n} route={{ params: {} }} />);
    act(() => porPlaceholder(r, 'usuario@hospital.mx').props.onChangeText('no-es-correo'));
    await pulsar(r, 'Enviar código');
    expect(api.recuperarClave).not.toHaveBeenCalled();
    expect(texto(r)).toContain(R.MENSAJES_RECUPERACION.correoInvalido);
  });
  test('envía el correo normalizado y pasa al paso 2', async () => {
    api.recuperarClave.mockResolvedValue({ mensaje: 'ok' });
    const n = nav();
    const r = await montar(<RecuperarCorreo navigation={n} route={{ params: { email: ' Ana@Hospital.MX ' } }} />);
    await pulsar(r, 'Enviar código');
    expect(api.recuperarClave).toHaveBeenCalledWith('ana@hospital.mx');
    expect(n.navigate).toHaveBeenCalledWith('RecuperarCodigo', { email: 'ana@hospital.mx' });
  });
  test('demasiadas solicitudes: mensaje claro y no avanza', async () => {
    api.recuperarClave.mockRejectedValue(err(429));
    const n = nav();
    const r = await montar(<RecuperarCorreo navigation={n} route={{ params: { email: 'ana@hospital.mx' } }} />);
    await pulsar(r, 'Enviar código');
    expect(texto(r)).toContain(R.MENSAJES_RECUPERACION.muchasSolicitudes);
    expect(n.navigate).not.toHaveBeenCalled();
  });
  test('explica que el PIN del médico no se recupera por correo', async () => {
    const r = await montar(<RecuperarCorreo navigation={nav()} route={{ params: {} }} />);
    expect(texto(r)).toContain('El PIN no se recupera por correo');
    expect(texto(r)).toContain('Paso 1 de 3');
  });
});

describe('Paso 2: código', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
  const ruta = { params: { email: 'ana.lopez@hospital.mx' } };

  test('muestra el correo enmascarado y verifica solo al completar los 6 dígitos', async () => {
    api.verificarCodigo.mockResolvedValue({ resetToken: 'tok-reset' });
    const n = nav();
    const r = await montar(<RecuperarCodigo navigation={n} route={ruta} />);
    expect(texto(r)).toContain('a•••z@hospital.mx');
    await act(async () => { porLabel(r, 'Código de 6 dígitos').props.onChangeText('12a3'); });
    expect(api.verificarCodigo).not.toHaveBeenCalled();
    expect(porLabel(r, 'Código de 6 dígitos').props.value).toBe('123');
    await act(async () => { porLabel(r, 'Código de 6 dígitos').props.onChangeText('123456'); });
    expect(api.verificarCodigo).toHaveBeenCalledWith('ana.lopez@hospital.mx', '123456');
    expect(n.navigate).toHaveBeenCalledWith('RecuperarClave', { resetToken: 'tok-reset' });
    act(() => r.unmount());
  });
  test('código incorrecto: borra las casillas y muestra un mensaje genérico', async () => {
    api.verificarCodigo.mockRejectedValue(err(400, 'CODIGO_INVALIDO'));
    const r = await montar(<RecuperarCodigo navigation={nav()} route={ruta} />);
    await act(async () => { porLabel(r, 'Código de 6 dígitos').props.onChangeText('000000'); });
    expect(texto(r)).toContain(R.MENSAJES_RECUPERACION.codigoInvalido);
    expect(porLabel(r, 'Código de 6 dígitos').props.value).toBe('');
    act(() => r.unmount());
  });
  test('"Reenviar código" aparece a los 60 s y reinicia la cuenta', async () => {
    api.recuperarClave.mockResolvedValue({});
    const r = await montar(<RecuperarCodigo navigation={nav()} route={ruta} />);
    expect(texto(r)).toContain('1:00');
    expect(boton(r, 'Reenviar código')).toBeUndefined();
    for (let i = 0; i < 60; i++) act(() => { jest.advanceTimersByTime(1000); });
    await pulsar(r, 'Reenviar código');
    expect(api.recuperarClave).toHaveBeenCalledWith('ana.lopez@hospital.mx');
    expect(texto(r)).toContain('Te enviamos un código nuevo');
    expect(boton(r, 'Reenviar código')).toBeUndefined();
    act(() => r.unmount());
  });
  test('código bloqueado por intentos: se puede pedir otro de inmediato', async () => {
    api.verificarCodigo.mockRejectedValue(err(400, 'CODIGO_BLOQUEADO'));
    const r = await montar(<RecuperarCodigo navigation={nav()} route={ruta} />);
    await act(async () => { porLabel(r, 'Código de 6 dígitos').props.onChangeText('999999'); });
    expect(texto(r)).toContain(R.MENSAJES_RECUPERACION.codigoBloqueado);
    expect(boton(r, 'Reenviar código')).toBeTruthy();
    act(() => r.unmount());
  });
});

describe('Paso 3: contraseña nueva', () => {
  const ruta = { params: { resetToken: 'tok-reset' } };
  const escribir = (r, nueva, confirmar) => {
    act(() => porPlaceholder(r, 'Escribe tu contraseña').props.onChangeText(nueva));
    act(() => porPlaceholder(r, 'Repite la contraseña').props.onChangeText(confirmar));
  };
  const guardarBtn = (r) => boton(r, 'Guardar contraseña');

  test('el botón se habilita solo cuando se cumplen todas las reglas', async () => {
    const r = await montar(<RecuperarClave navigation={nav()} route={ruta} />);
    expect(guardarBtn(r).props.accessibilityState.disabled).toBe(true);
    escribir(r, 'Hospital2', 'Hospital');
    expect(guardarBtn(r).props.accessibilityState.disabled).toBe(true);
    expect(texto(r)).toContain('Las dos contraseñas coinciden, pendiente');
    escribir(r, 'Hospital2', 'Hospital2');
    expect(guardarBtn(r).props.accessibilityState.disabled).toBe(false);
    expect(texto(r)).toContain('Al menos 8 caracteres, cumplido');
  });
  test('los campos tienen botón para ver la contraseña', async () => {
    const r = await montar(<RecuperarClave navigation={nav()} route={ruta} />);
    const entrada = () => r.root.findAll((n) => n.props.placeholder === 'Escribe tu contraseña' && 'secureTextEntry' in n.props)[0];
    expect(entrada().props.secureTextEntry).toBe(true);
    act(() => boton(r, 'Mostrar contraseña').props.onPress());
    expect(entrada().props.secureTextEntry).toBe(false);
  });
  test('al guardar: envía el resetToken y termina en "Contraseña actualizada" (atrás = login)', async () => {
    api.restablecerClave.mockResolvedValue({ ok: true });
    const n = nav();
    const r = await montar(<RecuperarClave navigation={n} route={ruta} />);
    escribir(r, 'Hospital2026', 'Hospital2026');
    await pulsar(r, 'Guardar contraseña');
    expect(api.restablecerClave).toHaveBeenCalledWith('tok-reset', 'Hospital2026');
    expect(n.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: 'Login' }, { name: 'RecuperarListo' }] });
  });
  test('si la verificación venció, regresa al paso 1 con el aviso', async () => {
    api.restablecerClave.mockRejectedValue(err(401, 'RESET_EXPIRADO'));
    const n = nav();
    const r = await montar(<RecuperarClave navigation={n} route={ruta} />);
    escribir(r, 'Hospital2026', 'Hospital2026');
    await pulsar(r, 'Guardar contraseña');
    expect(n.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: 'Login' }, { name: 'RecuperarCorreo', params: { aviso: R.MENSAJES_RECUPERACION.expirado } }] });
  });
});

describe('Listo', () => {
  test('confirma el cambio, avisa del cierre de sesiones y vuelve al login', async () => {
    const n = nav();
    const r = await montar(<RecuperarListo navigation={n} />);
    expect(texto(r)).toContain('Contraseña actualizada');
    expect(texto(r)).toContain('cerramos tu sesión en los demás dispositivos');
    await pulsar(r, 'Ir a iniciar sesión');
    expect(n.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });
});

describe('cliente HTTP', () => {
  test('el error conserva el código fijo de la API (CODIGO_BLOQUEADO, SESION_REVOCADA...)', async () => {
    jest.resetModules();
    jest.doMock('../src/config', () => ({ API_URL: 'https://api.prueba' }));
    const { http } = require('../src/api/client');
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: 'x', code: 'CODIGO_BLOQUEADO' }) }));
    const e = await http.post('/auth/recuperar/verificar', {}).catch((x) => x);
    expect(e.status).toBe(400);
    expect(e.code).toBe('CODIGO_BLOQUEADO');
  });
});
