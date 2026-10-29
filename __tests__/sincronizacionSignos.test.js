// Actividad 18: sincronización de signos vitales con la API (consulta GET y registro POST /enfermeria/signos)
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api', () => ({ getPatients: jest.fn(), getSignos: jest.fn(), createSignos: jest.fn() }));

const api = require('../src/api');
const { useAuth } = require('../src/context/AuthContext');
const SignosVitales = require('../src/screens/SignosVitales').default;
const { MENSAJES_ERROR } = require('../src/utils/errors');

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
const err = (status, message = 'detalle') => Object.assign(new Error(message), { status });

const PACIENTES = [{ id: 9, name: 'Paciente Demo Signos' }];
const REGISTROS = [{ id: 1, pacienteId: 9, paciente: 'Paciente Demo Signos', temperatura: 36.6, fc: 78, spo2: 97, registradoPor: 'Enf. Demo', fecha: '2026-10-29 10:00:00' }];

// Elige el paciente, abre el formulario y captura los valores indicados
async function capturar(r, valores) {
  await act(async () => select(r, 'Paciente').props.onChange('9'));
  await flush();
  act(() => boton(r, 'Registrar signos vitales').props.onPress());
  for (const [label, v] of Object.entries(valores)) act(() => campo(r, label).props.onChangeText(v));
}
const guardar = (r) => act(async () => { await boton(r, 'Guardar').props.onPress(); });

describe('Sincronización de signos vitales (Actividad 18)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuth.mockReturnValue({ user: { rol: 'enfermeria' }, can: (...roles) => roles.includes('enfermeria') });
    api.getPatients.mockResolvedValue(PACIENTES);
    api.getSignos.mockResolvedValue(REGISTROS);
  });

  test('S1 consulta: muestra los registros que devuelve la API', async () => {
    const r = await montar();
    expect(api.getSignos).toHaveBeenCalled();
    expect(texto(r)).toContain('Paciente Demo Signos');
    expect(texto(r)).toContain('36.6');
    act(() => r.unmount());
  });

  test('S2 registro y nueva consulta: envía el POST, confirma y vuelve a consultar', async () => {
    api.createSignos.mockResolvedValue({ id: 2 });
    const r = await montar();
    await capturar(r, { 'Temp. (°C)': '36.8', 'FC (lpm)': '80', 'Presión': '120/80' });
    const consultasAntes = api.getSignos.mock.calls.length;
    await guardar(r);
    await flush();
    expect(api.createSignos).toHaveBeenCalledWith(expect.objectContaining({ pacienteId: 9, temperatura: 36.8, frecuenciaCardiaca: 80, presionArterial: '120/80' }));
    expect(Alert.alert).toHaveBeenCalledWith('Listo', 'Signos vitales registrados.');
    expect(api.getSignos.mock.calls.length).toBeGreaterThan(consultasAntes);
    act(() => r.unmount());
  });

  test('S3 información incompleta: sin paciente o sin valores no se envía nada', async () => {
    const r = await montar();
    act(() => boton(r, 'Registrar signos vitales').props.onPress());
    await guardar(r);
    expect(texto(r)).toContain('Selecciona primero el paciente');

    await act(async () => select(r, 'Paciente').props.onChange('9'));
    await flush();
    await guardar(r);
    expect(texto(r)).toContain('Registra al menos un signo vital.');

    act(() => campo(r, 'Presión').props.onChangeText('120-80'));
    await guardar(r);
    expect(texto(r)).toContain('Presión arterial inválida');
    expect(api.createSignos).not.toHaveBeenCalled();
    act(() => r.unmount());
  });

  test('S4 respuesta fallida: el 400 de la API se muestra y un 500 no revela detalles', async () => {
    const r = await montar();
    await capturar(r, { 'Temp. (°C)': '36.8' });
    api.createSignos.mockRejectedValueOnce(err(404, 'Paciente no encontrado'));
    await guardar(r);
    expect(texto(r)).toContain('Paciente no encontrado');

    api.createSignos.mockRejectedValueOnce(err(500, 'ER_NO_SUCH_TABLE: signos_vitales at pool.js:88'));
    await guardar(r);
    expect(texto(r)).toContain(MENSAJES_ERROR.servicio);
    expect(texto(r)).not.toContain('ER_NO_SUCH_TABLE');
    act(() => r.unmount());
  });

  test('S5 error de conexión: avisa que no se pudo conectar y no muestra datos técnicos', async () => {
    const r = await montar();
    await capturar(r, { 'FC (lpm)': '80' });
    api.createSignos.mockRejectedValueOnce(err(0, 'TypeError: Network request failed'));
    await guardar(r);
    expect(texto(r)).toContain(MENSAJES_ERROR.sinConexion);
    expect(texto(r)).not.toContain('Network request failed');
    act(() => r.unmount());
  });

  test('S6 autorización: el médico consulta pero no ve el botón de registro', async () => {
    useAuth.mockReturnValue({ user: { rol: 'medico' }, can: (...roles) => roles.includes('medico') });
    const r = await montar();
    expect(texto(r)).toContain('Paciente Demo Signos');
    expect(boton(r, 'Registrar signos vitales')).toBeUndefined();
    act(() => r.unmount());
  });
});
