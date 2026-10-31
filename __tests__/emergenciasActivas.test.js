// Emergencias activas en el Dashboard: lista, ubicación, atender y recarga por aviso push.
import React from 'react';
import { Alert, Linking } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api', () => ({
  getEmergenciasActivas: jest.fn(),
  atenderEmergencia: jest.fn(() => Promise.resolve({ id: 7, estado: 'resuelta' })),
}));

const api = require('../src/api');
const { useAuth } = require('../src/context/AuthContext');
const { avisarCambioEmergencias } = require('../src/services/avisosEmergencia');
const EmergenciasActivas = require('../src/components/EmergenciasActivas').default;
const { leerFecha, horaCorta, tiempoTranscurrido, urlMapa } = require('../src/utils/emergencias');

const EMERGENCIAS = [
  { id: 7, mensaje: 'Código azul en urgencias', estado: 'activa', creada: '2026-10-28 21:05:00', activadaPor: 'Enf. Ana', ubicacion: { lat: 19.28, lng: -99.65 } },
  { id: 6, mensaje: 'Código de emergencia activado', estado: 'vista', creada: '2026-10-28 20:00:00', activadaPor: null, ubicacion: null },
];

const rolComo = (rol) => useAuth.mockReturnValue({
  user: { nombre: 'Prueba', rol },
  can: (...roles) => rol === 'administrador' || roles.includes(rol),
});

async function montar() {
  let r;
  await act(async () => { r = ReactTestRenderer.create(<EmergenciasActivas />); });
  return r;
}
const texto = (r) => JSON.stringify(r.toJSON());
const boton = (r, etiqueta) => r.root.findAll((n) => n.props.accessibilityLabel === etiqueta && typeof n.props.onPress === 'function')[0];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  api.getEmergenciasActivas.mockResolvedValue(EMERGENCIAS);
});

// ---- utilidades --------------------------------------------------------------
test('fechas de la API: hora corta, tiempo transcurrido y fechas inválidas', () => {
  expect(leerFecha('basura')).toBeNull();
  expect(horaCorta('2026-10-28 09:07:00')).toBe('09:07');
  const ahora = new Date(2026, 9, 28, 21, 35, 0);
  expect(tiempoTranscurrido('2026-10-28 21:35:00', ahora)).toBe('hace un momento');
  expect(tiempoTranscurrido('2026-10-28 21:05:00', ahora)).toBe('hace 30 min');
  expect(tiempoTranscurrido('2026-10-28 18:30:00', ahora)).toBe('hace 3 h');
  expect(tiempoTranscurrido('', ahora)).toBe('');
});

test('urlMapa solo con coordenadas válidas', () => {
  expect(urlMapa({ lat: 19.28, lng: -99.65 })).toBe('https://www.google.com/maps/search/?api=1&query=19.28,-99.65');
  expect(urlMapa(null)).toBeNull();
  expect(urlMapa({ lat: 'x', lng: 1 })).toBeNull();
});

// ---- componente --------------------------------------------------------------
test('enfermería ve las emergencias con quién la activó y el botón de ubicación solo si hay coordenadas', async () => {
  rolComo('enfermeria');
  const r = await montar();
  const t = texto(r);
  expect(t).toContain('2 emergencias activas');
  expect(t).toContain('Código azul en urgencias');
  expect(t).toContain('Activó Enf. Ana');
  expect(boton(r, 'Ver ubicación de la emergencia 7')).toBeTruthy();
  expect(boton(r, 'Ver ubicación de la emergencia 6')).toBeUndefined();
  expect(t).toContain('Sin ubicación');
  act(() => r.unmount());
});

test('sin emergencias no muestra nada', async () => {
  rolComo('medico');
  api.getEmergenciasActivas.mockResolvedValue([]);
  const r = await montar();
  expect(r.toJSON()).toBeNull();
  act(() => r.unmount());
});

test('farmacia no consulta emergencias ni ve el bloque', async () => {
  rolComo('farmacia');
  const r = await montar();
  expect(api.getEmergenciasActivas).not.toHaveBeenCalled();
  expect(r.toJSON()).toBeNull();
  act(() => r.unmount());
});

test('Ver ubicación abre la app de mapas', async () => {
  rolComo('medico');
  const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const r = await montar();
  act(() => boton(r, 'Ver ubicación de la emergencia 7').props.onPress());
  expect(abrir).toHaveBeenCalledWith('https://www.google.com/maps/search/?api=1&query=19.28,-99.65');
  act(() => r.unmount());
});

test('Atender pide confirmación, llama a la API y recarga la lista', async () => {
  rolComo('medico');
  const r = await montar();
  act(() => boton(r, 'Atender emergencia 7').props.onPress());
  const [titulo, , botones] = Alert.alert.mock.calls[0];
  expect(titulo).toBe('Atender emergencia');
  api.getEmergenciasActivas.mockResolvedValue([EMERGENCIAS[1]]);
  await act(async () => { await botones.find((b) => b.text === 'Atender').onPress(); });
  expect(api.atenderEmergencia).toHaveBeenCalledWith(7);
  expect(texto(r)).toContain('1 emergencia activa');
  expect(texto(r)).not.toContain('Código azul en urgencias');
  act(() => r.unmount());
});

test('si otra persona ya la atendió, avisa y recarga', async () => {
  rolComo('enfermeria');
  api.atenderEmergencia.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 404 }));
  const r = await montar();
  act(() => boton(r, 'Atender emergencia 7').props.onPress());
  const botones = Alert.alert.mock.calls[0][2];
  await act(async () => { await botones.find((b) => b.text === 'Atender').onPress(); });
  expect(Alert.alert).toHaveBeenLastCalledWith('No se pudo atender', 'Otra persona ya la atendió.');
  expect(api.getEmergenciasActivas).toHaveBeenCalledTimes(2);
  act(() => r.unmount());
});

test('un aviso de emergencia nueva (push o botón) recarga la lista', async () => {
  rolComo('enfermeria');
  api.getEmergenciasActivas.mockResolvedValue([]);
  const r = await montar();
  expect(r.toJSON()).toBeNull();
  api.getEmergenciasActivas.mockResolvedValue(EMERGENCIAS);
  await act(async () => { avisarCambioEmergencias(); });
  expect(texto(r)).toContain('2 emergencias activas');
  act(() => r.unmount());
  // Al desmontar se quita la suscripción: un aviso posterior ya no consulta la API
  const llamadas = api.getEmergenciasActivas.mock.calls.length;
  avisarCambioEmergencias();
  expect(api.getEmergenciasActivas.mock.calls.length).toBe(llamadas);
});
