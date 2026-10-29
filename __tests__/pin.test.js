// RF-02 / HU-02: el médico entra con correo, contraseña y PIN de 4 dígitos
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));

const { useAuth } = require('../src/context/AuthContext');
const Login = require('../src/screens/Login').default;
const { validarPin, MENSAJES_PIN } = require('../src/utils/validation');
const { mensajePin, MENSAJES_ERROR_PIN, MENSAJES_ERROR } = require('../src/utils/errors');

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 24, left: 0, right: 0, bottom: 34 } };
const render = (el) => { let r; act(() => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); }); return r; };
const texts = (r) => JSON.stringify(r.toJSON());
const campo = (r, placeholder) => r.root.findAll((n) => n.props.placeholder === placeholder && typeof n.props.onChangeText === 'function')[0];
const boton = (r, label) => r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
const escribir = (r, placeholder, valor) => act(() => campo(r, placeholder).props.onChangeText(valor));
const pulsar = async (r, label) => { await act(async () => { await boton(r, label).props.onPress(); }); };

describe('validarPin y mensajePin', () => {
  test('el PIN debe tener 4 dígitos', () => {
    expect(validarPin('')).toMatchObject({ ok: false, error: MENSAJES_PIN.vacio });
    expect(validarPin('12a4').error).toBe(MENSAJES_PIN.formato);
    expect(validarPin('123').error).toBe(MENSAJES_PIN.formato);
    expect(validarPin(' 4821 ')).toEqual({ ok: true, error: null, valor: '4821' });
  });
  test('cada error del PIN se traduce a un mensaje controlado', () => {
    expect(mensajePin({ status: 401, message: 'PIN incorrecto.' })).toEqual({ mensaje: MENSAJES_ERROR_PIN.incorrecto, expirado: false });
    expect(mensajePin({ status: 401, message: 'La verificación expiró. Inicia sesión de nuevo.' })).toEqual({ mensaje: MENSAJES_ERROR_PIN.expirado, expirado: true });
    expect(mensajePin({ status: 403 })).toEqual({ mensaje: MENSAJES_ERROR_PIN.sinPin, expirado: true });
    expect(mensajePin({ status: 403, message: 'Este dispositivo está bloqueado. Pide al administrador que lo desbloquee.' }))
      .toEqual({ mensaje: MENSAJES_ERROR.dispositivoBloqueado, expirado: true });
    expect(mensajePin({ status: 429 }).mensaje).toBe(MENSAJES_ERROR.demasiadosIntentos);
    expect(mensajePin({ status: 0 }).mensaje).toBe(MENSAJES_ERROR.sinConexion);
    expect(mensajePin({ status: 500, message: 'SQLSTATE detalle' }).mensaje).toBe(MENSAJES_ERROR.servicio);
  });
});

describe('Pantalla de login con PIN', () => {
  let login, verificarPin;
  beforeEach(() => {
    jest.useFakeTimers();
    login = jest.fn();
    verificarPin = jest.fn();
    useAuth.mockReturnValue({ login, verificarPin });
  });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  const hastaPin = async () => {
    login.mockResolvedValue({ requierePin: true, pinToken: 'ptk' });
    const r = render(<Login />);
    escribir(r, 'usuario@hospital.com', 'medico@hospital.com');
    escribir(r, '••••••••', 'Clave-Segura-1');
    await pulsar(r, 'Iniciar sesión');
    return r;
  };

  test('si la cuenta es de médico, se pide el PIN y no se abre la sesión todavía', async () => {
    const r = await hastaPin();
    expect(texts(r)).toContain('Verificación de seguridad');
    expect(campo(r, '••••').props.maxLength).toBe(4);
    expect(campo(r, '••••').props.keyboardType).toBe('number-pad');
    expect(verificarPin).not.toHaveBeenCalled();
    act(() => r.unmount());
  });

  test('el campo de PIN solo acepta dígitos y no envía un PIN incompleto', async () => {
    const r = await hastaPin();
    escribir(r, '••••', '4a8');
    expect(campo(r, '••••').props.value).toBe('48');
    await pulsar(r, 'Verificar PIN');
    expect(verificarPin).not.toHaveBeenCalled();
    expect(texts(r)).toContain(MENSAJES_PIN.formato);
    act(() => r.unmount());
  });

  test('con el PIN correcto se llama a verificarPin con el pinToken', async () => {
    const r = await hastaPin();
    verificarPin.mockResolvedValue();
    escribir(r, '••••', '4821');
    await pulsar(r, 'Verificar PIN');
    expect(verificarPin).toHaveBeenCalledWith('ptk', '4821');
    act(() => r.unmount());
  });

  test('PIN incorrecto: mensaje controlado, se vacía el campo y sigue en el paso del PIN', async () => {
    const r = await hastaPin();
    verificarPin.mockRejectedValue(Object.assign(new Error('PIN incorrecto.'), { status: 401 }));
    escribir(r, '••••', '0000');
    await pulsar(r, 'Verificar PIN');
    expect(texts(r)).toContain(MENSAJES_ERROR_PIN.incorrecto);
    expect(campo(r, '••••').props.value).toBe('');
    act(() => r.unmount());
  });

  test('si la verificación expiró, vuelve a pedir correo y contraseña', async () => {
    const r = await hastaPin();
    verificarPin.mockRejectedValue(Object.assign(new Error('La verificación expiró. Inicia sesión de nuevo.'), { status: 401 }));
    escribir(r, '••••', '4821');
    await pulsar(r, 'Verificar PIN');
    expect(texts(r)).toContain(MENSAJES_ERROR_PIN.expirado);
    expect(campo(r, '••••••••').props.value).toBe('');
    act(() => r.unmount());
  });

  test('"Usar otra cuenta" regresa al formulario de credenciales', async () => {
    const r = await hastaPin();
    await pulsar(r, 'Usar otra cuenta');
    expect(texts(r)).toContain('Iniciar sesión');
    expect(campo(r, 'usuario@hospital.com')).toBeTruthy();
    act(() => r.unmount());
  });

  test('otros roles entran directo, sin paso de PIN', async () => {
    login.mockResolvedValue({ requierePin: false });
    const r = render(<Login />);
    escribir(r, 'usuario@hospital.com', 'enfermera@hospital.com');
    escribir(r, '••••••••', 'Clave-Segura-1');
    await pulsar(r, 'Iniciar sesión');
    expect(texts(r)).not.toContain('Verificación de seguridad');
    act(() => r.unmount());
  });
});
