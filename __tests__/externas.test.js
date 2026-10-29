// CP-24..26: derivación externa con GPS y confirmación
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn(() => ({ user: { rol: 'medico' }, can: () => true })) }));
jest.mock('../src/api', () => ({
  getExternas: jest.fn(),
  getPatients: jest.fn(),
  getHospitals: jest.fn(),
  createExterna: jest.fn(),
}));
jest.mock('../src/services/geolocation', () => ({
  MENSAJES_GPS: { denegado: 'Permiso de ubicación denegado. Actívalo en Ajustes para ordenar por cercanía.', sin_gps: 'sin gps' },
  getPositionDetail: jest.fn(),
}));

const api = require('../src/api');
const { getPositionDetail } = require('../src/services/geolocation');
const Externas = require('../src/screens/Externas').default;

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
async function abrirFormulario() {
  let r;
  await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}><Externas /></SafeAreaProvider>); });
  await flush();
  const nuevo = r.root.findAll((n) => n.props.title === 'Nuevo traslado' && typeof n.props.onPress === 'function')[0];
  await act(async () => { nuevo.props.onPress(); });
  await flush();
  return r;
}

beforeEach(() => {
  jest.clearAllMocks();
  api.getExternas.mockResolvedValue([]);
  api.getPatients.mockResolvedValue([{ id: 1, name: 'Paciente' }]);
  api.getHospitals.mockResolvedValue([{ id: 9, nombre: 'Hospital Norte', distanciaKm: 3.2 }]);
});

test('con GPS denegado muestra el aviso con Reintentar y consulta hospitales sin posición', async () => {
  getPositionDetail.mockResolvedValue({ pos: null, motivo: 'denegado' });
  const r = await abrirFormulario();
  expect(JSON.stringify(r.toJSON())).toContain('Permiso de ubicación denegado');
  expect(api.getHospitals).toHaveBeenCalledWith(null);
  act(() => r.unmount());
});

test('con GPS pide los hospitales con la posición', async () => {
  getPositionDetail.mockResolvedValue({ pos: { lat: 1, lng: 2 }, motivo: null });
  const r = await abrirFormulario();
  expect(api.getHospitals).toHaveBeenCalledWith({ lat: 1, lng: 2 });
  expect(JSON.stringify(r.toJSON())).not.toContain('Permiso de ubicación denegado');
  act(() => r.unmount());
});

test('no se crea el traslado sin confirmación del usuario', async () => {
  getPositionDetail.mockResolvedValue({ pos: null, motivo: null });
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const r = await abrirFormulario();
  const selects = r.root.findAll((n) => typeof n.props.onChange === 'function' && n.props.label);
  act(() => selects.find((n) => n.props.label === 'Paciente').props.onChange(1));
  act(() => selects.find((n) => n.props.label === 'Hospital destino').props.onChange(9));
  const motivo = r.root.findAll((n) => n.props.label === 'Motivo' && typeof n.props.onChangeText === 'function')[0];
  act(() => motivo.props.onChangeText('Requiere UCI'));
  const solicitar = r.root.findAll((n) => n.props.title === 'Solicitar traslado' && typeof n.props.onPress === 'function')[0];
  await act(async () => { solicitar.props.onPress(); });
  expect(spy).toHaveBeenCalled();
  expect(api.createExterna).not.toHaveBeenCalled();
  api.createExterna.mockResolvedValue({ id: 1 });
  await act(async () => { await spy.mock.calls[0][2].find((b) => b.text === 'Derivar').onPress(); });
  expect(api.createExterna).toHaveBeenCalledWith({ pacienteId: 1, hospitalId: 9, motivo: 'Requiere UCI' });
  act(() => r.unmount());
});
