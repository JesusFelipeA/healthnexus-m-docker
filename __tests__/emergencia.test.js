// CP-30/32/33: botón de emergencia (roles, sin conexión, número de registro)
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api', () => ({ activarEmergencia: jest.fn() }));
jest.mock('../src/services/geolocation', () => ({ getPositionDetail: jest.fn() }));

const { useAuth } = require('../src/context/AuthContext');
const { activarEmergencia } = require('../src/api');
const { getPositionDetail } = require('../src/services/geolocation');
const EmergencyButton = require('../src/components/EmergencyButton').default;

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const render = () => {
  let r;
  act(() => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}><EmergencyButton /></SafeAreaProvider>); });
  return r;
};
const boton = (r) => r.root.findAll((n) => n.props.accessibilityLabel === 'Código de emergencia' && n.props.accessibilityRole === 'button')[0];
const sesion = (rol) => useAuth.mockReturnValue({
  user: { rol },
  can: (...roles) => rol === 'administrador' || roles.includes(rol),
});

// Pulsa el botón, confirma "Activar" y devuelve las alertas mostradas
async function activar(r) {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  act(() => boton(r).props.onPress());
  const confirmar = spy.mock.calls[0][2].find((b) => b.text === 'Activar');
  await act(async () => { await confirmar.onPress(); });
  return spy;
}

beforeEach(() => {
  jest.clearAllMocks();
  getPositionDetail.mockResolvedValue({ pos: { lat: 19.4, lng: -99.1 }, motivo: null });
});
afterEach(() => jest.restoreAllMocks());

test('farmacia no ve el botón de emergencia', () => {
  sesion('farmacia');
  expect(boton(render())).toBeUndefined();
});

test.each(['medico', 'enfermeria'])('%s sí ve el botón', (rol) => {
  sesion(rol);
  expect(boton(render())).toBeDefined();
});

test('al activar envía la ubicación y muestra el número de registro', async () => {
  sesion('medico');
  activarEmergencia.mockResolvedValue({ id: 77, estado: 'activa' });
  const spy = await activar(render());
  expect(activarEmergencia).toHaveBeenCalledWith(expect.any(String), { lat: 19.4, lng: -99.1 });
  expect(JSON.stringify(spy.mock.calls[1])).toContain('77');
});

test('sin GPS la emergencia se envía igualmente, sin ubicación', async () => {
  sesion('enfermeria');
  getPositionDetail.mockResolvedValue({ pos: null, motivo: 'sin_gps' });
  activarEmergencia.mockResolvedValue({ id: 5 });
  await activar(render());
  expect(activarEmergencia).toHaveBeenCalledWith(expect.any(String), undefined);
});

test('sin conexión avisa que NO se registró y ofrece reintentar', async () => {
  sesion('medico');
  activarEmergencia.mockRejectedValue(Object.assign(new Error('x'), { status: 0 }));
  const spy = await activar(render());
  const [titulo, msg, botones] = spy.mock.calls[1];
  expect(titulo).toBe('Sin conexión');
  expect(msg).toBe('Sin conexión: la emergencia NO se registró. Avisa por otro medio y reintenta.');
  expect(botones.map((b) => b.text)).toContain('Reintentar');
});
