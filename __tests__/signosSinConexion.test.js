// Modo sin conexión, fase 1: signos vitales capturados sin red (o con el servidor apagado) y enviados al reconectar.
import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/services/push', () => ({ detenerPush: jest.fn(async () => {}) }));
// Keystore simulado en memoria
jest.mock('../src/services/secureStorage', () => {
  const almacen = { offline: null, token: null };
  return {
    __almacen: almacen,
    leerOffline: jest.fn(async () => (almacen.offline ? JSON.parse(almacen.offline) : null)),
    guardarOffline: jest.fn(async (d) => { almacen.offline = JSON.stringify(d); }),
    getToken: jest.fn(async () => almacen.token),
    saveToken: jest.fn(async (t) => { almacen.token = t; }),
    clearToken: jest.fn(async () => { almacen.token = null; }),
    getDeviceFingerprint: jest.fn(async () => 'huella'),
  };
});
jest.mock('../src/api', () => ({ getPatients: jest.fn(), getSignos: jest.fn(), createSignos: jest.fn(), getPatient: jest.fn(async () => ({})), me: jest.fn() }));

const api = require('../src/api');
const almacen = require('../src/services/secureStorage').__almacen;
const offline = require('../src/services/offline');

const sinRed = () => Object.assign(new Error('Network request failed'), { status: 0 });
const http = (status, message = 'detalle') => Object.assign(new Error(message), { status });
const ENF = { id: 7, name: 'Enf. Ruiz', rol: 'enfermeria' };

beforeEach(() => {
  jest.clearAllMocks();
  almacen.offline = null;
  almacen.token = null;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('Cola cifrada y sincronización (servicio)', () => {
  test('encola con un UUID v4 y la hora de la toma, y al reconectar envía y vacía la cola', async () => {
    const item = await offline.encolarSignos(7, { pacienteId: 9, temperatura: 37.9 }, 'Laura Pérez');
    expect(item.clientUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(Date.now() - new Date(item.capturadoEn).getTime()).toBeLessThan(5000);
    expect(almacen.offline).toContain('"estado":"pendiente"');

    const enviar = jest.fn(async () => ({ id: 1 }));
    const r = await offline.sincronizarSignos(7, enviar);
    expect(enviar).toHaveBeenCalledWith({ pacienteId: 9, temperatura: 37.9, clientUuid: item.clientUuid, capturadoEn: item.capturadoEn });
    expect(r).toEqual({ enviados: 1, rechazados: 0, pendientes: 0, sinConexion: false });
    expect(await offline.colaDe(7)).toEqual([]);
  });

  test('sigue sin conexión: no pierde nada y conserva el orden', async () => {
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 37 }, 'A');
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 38 }, 'B');
    const r = await offline.sincronizarSignos(7, jest.fn(async () => { throw sinRed(); }));
    expect(r).toMatchObject({ enviados: 0, sinConexion: true, pendientes: 2 });
    expect((await offline.colaDe(7)).map((i) => i.body.temperatura)).toEqual([37, 38]);
  });

  test('un corte a medio envío: lo enviado sale de la cola y el resto se reintenta después', async () => {
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 37 }, 'A');
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 38 }, 'B');
    const enviar = jest.fn().mockResolvedValueOnce({ id: 1 }).mockRejectedValueOnce(sinRed());
    expect(await offline.sincronizarSignos(7, enviar)).toMatchObject({ enviados: 1, pendientes: 1 });
    expect((await offline.colaDe(7))[0].body.temperatura).toBe(38);
  });

  test('si la API ya lo había recibido (200 duplicado) también sale de la cola', async () => {
    await offline.encolarSignos(7, { pacienteId: 9, fc: 80 }, 'A');
    expect(await offline.sincronizarSignos(7, jest.fn(async () => ({ id: 5, duplicado: true })))).toMatchObject({ enviados: 1, pendientes: 0 });
  });

  test('un rechazo (400/404/409) queda marcado con su motivo, no se reintenta solo y no detiene a los demás', async () => {
    await offline.encolarSignos(7, { pacienteId: 404, temperatura: 37 }, 'A');
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 38 }, 'B');
    const enviar = jest.fn().mockRejectedValueOnce(http(404, 'Paciente no encontrado')).mockResolvedValueOnce({ id: 2 });
    expect(await offline.sincronizarSignos(7, enviar)).toMatchObject({ enviados: 1, rechazados: 1, pendientes: 1 });
    const [rechazado] = await offline.colaDe(7);
    expect(rechazado).toMatchObject({ estado: 'error', error: 'Paciente no encontrado' });

    enviar.mockClear();
    await offline.sincronizarSignos(7, enviar);
    expect(enviar).not.toHaveBeenCalled();
    await offline.descartar(7, rechazado.clientUuid);
    expect(await offline.colaDe(7)).toEqual([]);
  });

  test('sesión vencida (401) o servidor con error (500): se detiene y conserva la cola; un 500 no guarda el detalle técnico', async () => {
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 37 }, 'A');
    for (const e of [http(401), http(500, 'ER_NO_SUCH_TABLE at pool.js')]) {
      expect(await offline.sincronizarSignos(7, jest.fn(async () => { throw e; }))).toMatchObject({ enviados: 0, pendientes: 1 });
    }
    expect(almacen.offline).not.toContain('ER_NO_SUCH_TABLE');
    expect((await offline.colaDe(7))[0].estado).toBe('pendiente');
  });

  test('cada cuenta solo envía lo que ella capturó', async () => {
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 37 }, 'A');
    const enviar = jest.fn(async () => ({ id: 1 }));
    await offline.sincronizarSignos(8, enviar);
    expect(enviar).not.toHaveBeenCalled();
    expect(await offline.colaDe(7)).toHaveLength(1);
  });

  test('pacientes del selector: vigentes 12 horas y solo para la cuenta que los descargó', async () => {
    await offline.guardarPacientes(7, [{ id: 9, name: 'Laura', age: 40, sexo: 'mujer', curp: 'NO-DEBE-GUARDARSE' }]);
    expect(almacen.offline).not.toContain('NO-DEBE-GUARDARSE');
    expect((await offline.pacientesGuardados(7)).lista).toEqual([{ id: 9, name: 'Laura', age: 40, sexo: 'mujer' }]);
    expect(await offline.pacientesGuardados(8)).toBeNull();

    const ahora = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(ahora + offline.VIGENCIA_PACIENTES_MS + 1);
    expect(await offline.pacientesGuardados(7)).toBeNull();
    Date.now.mockRestore();
  });

  test('cerrar sesión borra la sesión y los pacientes guardados, pero conserva los pendientes de esa cuenta', async () => {
    await offline.guardarUsuario(ENF);
    await offline.guardarPacientes(7, [{ id: 9, name: 'Laura' }]);
    await offline.encolarSignos(7, { pacienteId: 9, temperatura: 37 }, 'Laura');
    await offline.cerrarSesionOffline();
    expect(await offline.usuarioGuardado()).toBeNull();
    expect(await offline.pacientesGuardados(7)).toBeNull();
    expect(await offline.colaDe(7)).toHaveLength(1);
  });
});

/* ---------------- Pantalla de signos vitales ---------------- */
jest.mock('../src/context/AuthContext', () => {
  const real = jest.requireActual('../src/context/AuthContext');
  return { ...real, useAuth: jest.fn(real.useAuth) };
});
const { useAuth, AuthProvider } = require('../src/context/AuthContext');
const SignosVitales = require('../src/screens/SignosVitales').default;

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const montar = async () => {
  let r;
  await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}><SignosVitales /></SafeAreaProvider>); });
  await flush();
  return r;
};
const texto = (r) => JSON.stringify(r.toJSON());
const campo = (r, label) => r.root.findAll((n) => n.props.label === label && typeof n.props.onChangeText === 'function')[0];
const select = (r, label) => r.root.findAll((n) => n.props.label === label && typeof n.props.onChange === 'function')[0];
const boton = (r, title) => r.root.findAll((n) => n.props.title === title && typeof n.props.onPress === 'function')[0];

describe('Pantalla de signos vitales sin conexión', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: ENF, can: (...roles) => roles.includes('enfermeria') });
    api.getPatients.mockResolvedValue([{ id: 9, name: 'Laura Pérez' }]);
    api.getSignos.mockResolvedValue([]);
  });

  test('sin conexión al guardar: se queda en el teléfono, avisa y aparece como pendiente (no como error)', async () => {
    const r = await montar();
    await act(async () => select(r, 'Paciente').props.onChange('9'));
    await flush();
    act(() => boton(r, 'Registrar signos vitales').props.onPress());
    act(() => campo(r, 'FC (lpm)').props.onChangeText('82'));
    api.createSignos.mockRejectedValueOnce(sinRed());
    await act(async () => { await boton(r, 'Guardar').props.onPress(); });
    await flush();

    const t = texto(r);
    expect(t).toContain('Sin conexión: se guardó en el teléfono y se enviará al reconectar');
    expect(t).toContain('Pendiente de enviar');
    expect(t).toContain('1 registro guardado');
    expect(t).not.toContain('No se pudo conectar con el servidor');
    expect(t).not.toContain('Network request failed');
    expect(await offline.colaDe(7)).toHaveLength(1);
    act(() => r.unmount());
  });

  test('sin conexión al abrir: el selector usa los pacientes guardados y se puede registrar', async () => {
    await offline.guardarPacientes(7, [{ id: 9, name: 'Laura Guardada' }]);
    api.getPatients.mockRejectedValueOnce(sinRed());
    api.getSignos.mockRejectedValue(sinRed());
    const r = await montar();
    const t = texto(r);
    expect(t).toContain('Sin conexión');
    expect(select(r, 'Paciente').props.options).toEqual([{ value: 9, label: 'Laura Guardada' }]);
    expect(boton(r, 'Registrar signos vitales')).toBeDefined();
    act(() => r.unmount());
  });

  test('"Enviar ahora" al reconectar: envía con su clientUuid y la hora de captura, y avisa cuántos se enviaron', async () => {
    const item = await offline.encolarSignos(7, { pacienteId: 9, frecuenciaCardiaca: 82 }, 'Laura Pérez');
    const r = await montar();
    expect(texto(r)).toContain('Pendientes de enviar');
    api.createSignos.mockResolvedValueOnce({ id: 33 });
    await act(async () => { await boton(r, 'Enviar ahora').props.onPress(); });
    await flush();
    expect(api.createSignos).toHaveBeenCalledWith(expect.objectContaining({ clientUuid: item.clientUuid, capturadoEn: item.capturadoEn, frecuenciaCardiaca: 82 }));
    expect(texto(r)).toContain('1 registro enviado');
    expect(texto(r)).not.toContain('Pendiente de enviar');
    act(() => r.unmount());
  });

  test('un registro que el servidor rechazó se muestra con el motivo y se puede descartar', async () => {
    const item = await offline.encolarSignos(7, { pacienteId: 9, temperatura: 37 }, 'Laura Pérez');
    await offline.sincronizarSignos(7, async () => { throw http(404, 'Paciente no encontrado'); });
    const r = await montar();
    expect(texto(r)).toContain('"No se pudo enviar: ","Laura Pérez"');
    expect(texto(r)).toContain('Paciente no encontrado');
    act(() => boton(r, 'Descartar').props.onPress());
    const [, , opciones] = Alert.alert.mock.calls[0];
    await act(async () => { await opciones.find((o) => o.text === 'Descartar').onPress(); });
    await flush();
    expect(await offline.colaDe(7)).toEqual([]);
    expect(item.clientUuid).toBeTruthy();
    act(() => r.unmount());
  });
});

/* ---------------- Sesión al abrir la app ---------------- */
describe('Sesión al abrir la app sin conexión', () => {
  function Quien() {
    const { user, loading } = jest.requireActual('../src/context/AuthContext').useAuth();
    return <Text>{loading ? 'cargando' : user ? `${user.name}${user.sinConexion ? ' (sin conexión)' : ''}` : 'sin sesión'}</Text>;
  }
  const abrir = async () => {
    let r;
    await act(async () => { r = ReactTestRenderer.create(<AuthProvider><Quien /></AuthProvider>); });
    await flush();
    return r;
  };

  test('sin red, la sesión sigue abierta con los datos guardados (antes se cerraba)', async () => {
    almacen.token = 'tk';
    await offline.guardarUsuario(ENF);
    api.me.mockRejectedValueOnce(sinRed());
    const r = await abrir();
    expect(texto(r)).toContain('Enf. Ruiz (sin conexión)');
    act(() => r.unmount());
  });

  test('si el token ya no vale (401) la sesión se cierra como siempre', async () => {
    almacen.token = 'tk';
    await offline.guardarUsuario(ENF);
    api.me.mockRejectedValueOnce(http(401));
    const r = await abrir();
    expect(texto(r)).toContain('sin sesión');
    expect(almacen.token).toBeNull();
    act(() => r.unmount());
  });

  test('con conexión, guarda la sesión para la próxima vez que no haya red', async () => {
    almacen.token = 'tk';
    api.me.mockResolvedValueOnce(ENF);
    const r = await abrir();
    expect(texto(r)).toContain('Enf. Ruiz');
    expect(await offline.usuarioGuardado()).toEqual(ENF);
    act(() => r.unmount());
  });
});
