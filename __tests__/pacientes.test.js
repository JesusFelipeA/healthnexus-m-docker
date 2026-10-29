// Actividad 15: módulo de pacientes conectado a la API (consulta GET y registro POST)
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/api', () => ({
  getPatients: jest.fn(), getPatient: jest.fn(), createPatient: jest.fn(),
  getEstados: jest.fn(() => Promise.resolve([{ id: 15, nombre: 'México' }])), getMunicipios: jest.fn(() => Promise.resolve([])),
}));

const api = require('../src/api');
const Patients = require('../src/screens/Patients').default;
const NuevoPaciente = require('../src/screens/NuevoPaciente').default;
const { MENSAJES_ERROR } = require('../src/utils/errors');

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const montar = async (el) => { let r; await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); }); await flush(); return r; };
const texto = (r) => JSON.stringify(r.toJSON());
const campo = (r, label) => r.root.findAll((n) => n.props.label === label && typeof n.props.onChangeText === 'function')[0];
const select = (r, label) => r.root.findAll((n) => n.props.label === label && typeof n.props.onChange === 'function')[0];
const boton = (r, title) => r.root.findAll((n) => n.props.title === title && typeof n.props.onPress === 'function')[0];
const err = (status, message = 'detalle') => Object.assign(new Error(message), { status });

describe('Consulta de pacientes (GET /api/patients)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('P1 consulta exitosa: muestra los pacientes que devuelve la API', async () => {
    api.getPatients.mockResolvedValue([
      { id: 1, name: 'Paciente Demo Uno', age: 34, sexo: 'mujer', telefono: '7221234567' },
      { id: 2, name: 'Paciente Demo Dos', age: 61, sexo: 'hombre' },
    ]);
    const r = await montar(<Patients navigation={{ navigate: jest.fn(), setParams: jest.fn() }} route={{ params: {} }} />);
    expect(api.getPatients).toHaveBeenCalledWith('');
    expect(texto(r)).toContain('Paciente Demo Uno');
    expect(texto(r)).toContain('Paciente Demo Dos');
    act(() => r.unmount());
  });

  test('P4 error de conexión: aviso claro con Reintentar, sin datos técnicos', async () => {
    api.getPatients.mockRejectedValue(err(0, 'TypeError: Network request failed at fetch.js:42'));
    const r = await montar(<Patients navigation={{ navigate: jest.fn(), setParams: jest.fn() }} route={{ params: {} }} />);
    expect(texto(r)).toContain(MENSAJES_ERROR.sinConexion);
    expect(texto(r)).not.toContain('fetch.js');
    api.getPatients.mockResolvedValue([{ id: 3, name: 'Paciente Demo Tres', age: 20, sexo: 'otro' }]);
    const reintentar = r.root.findAll((n) => n.props.accessibilityLabel === 'Reintentar' && typeof n.props.onPress === 'function')[0];
    await act(async () => { reintentar.props.onPress(); });
    await flush();
    expect(texto(r)).toContain('Paciente Demo Tres');
    act(() => r.unmount());
  });

  test('P5 sesión vencida (401): pide iniciar sesión de nuevo', async () => {
    api.getPatients.mockRejectedValue(err(401, 'Token inválido o expirado'));
    const r = await montar(<Patients navigation={{ navigate: jest.fn(), setParams: jest.fn() }} route={{ params: {} }} />);
    expect(texto(r)).toContain('Tu sesión expiró. Inicia sesión de nuevo.');
    act(() => r.unmount());
  });
});

describe('Registro de pacientes (POST /api/patients)', () => {
  beforeEach(() => jest.clearAllMocks());
  const llenar = (r) => {
    act(() => campo(r, 'Nombre(s) *').props.onChangeText('María'));
    act(() => campo(r, 'Apellido paterno *').props.onChangeText('Demo'));
    act(() => campo(r, 'Fecha de nacimiento * (AAAA-MM-DD)').props.onChangeText('19900515'));
    act(() => select(r, 'Sexo *').props.onChange('mujer'));
  };

  test('P2 registro válido: envía el POST y confirma al usuario', async () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    api.createPatient.mockResolvedValue({ id: 50, nombre: 'María', apellidoPaterno: 'Demo' });
    const nav = { navigate: jest.fn(), goBack: jest.fn() };
    const r = await montar(<NuevoPaciente navigation={nav} />);
    llenar(r);
    await act(async () => { await boton(r, 'Guardar paciente').props.onPress(); });
    expect(api.createPatient).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'María', apellidoPaterno: 'Demo', fechaNacimiento: '1990-05-15', sexo: 'mujer' }));
    expect(spy).toHaveBeenCalledWith('Paciente registrado', 'María Demo se guardó correctamente.');
    expect(nav.navigate).toHaveBeenCalledWith('Patients', { nuevoId: 50 });
    spy.mockRestore();
    act(() => r.unmount());
  });

  test('P3 formulario incompleto: no se envía nada y se indica el campo', async () => {
    const r = await montar(<NuevoPaciente navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
    await act(async () => { await boton(r, 'Guardar paciente').props.onPress(); });
    expect(api.createPatient).not.toHaveBeenCalled();
    expect(texto(r)).toContain('Escribe el nombre del paciente.');
    act(() => campo(r, 'Nombre(s) *').props.onChangeText('María'));
    act(() => campo(r, 'Apellido paterno *').props.onChangeText('Demo'));
    await act(async () => { await boton(r, 'Guardar paciente').props.onPress(); });
    expect(texto(r)).toContain('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
    expect(api.createPatient).not.toHaveBeenCalled();
    act(() => r.unmount());
  });

  test('P4 respuesta fallida: 409 muestra el motivo y 500 un mensaje genérico', async () => {
    const r = await montar(<NuevoPaciente navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);
    llenar(r);
    api.createPatient.mockRejectedValueOnce(err(409, 'Ya existe un paciente registrado con esa CURP'));
    await act(async () => { await boton(r, 'Guardar paciente').props.onPress(); });
    expect(texto(r)).toContain('Ya existe un paciente registrado con esa CURP');
    api.createPatient.mockRejectedValueOnce(err(500, "ER_NO_SUCH_TABLE: Table 'healthnexusdb.pacientes' doesn't exist"));
    await act(async () => { await boton(r, 'Guardar paciente').props.onPress(); });
    expect(texto(r)).toContain(MENSAJES_ERROR.servicio);
    expect(texto(r)).not.toContain('ER_NO_SUCH_TABLE');
    act(() => r.unmount());
  });
});
