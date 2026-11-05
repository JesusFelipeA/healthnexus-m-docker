// T-35.2: registrar una administración desde la app descuenta el inventario (la API lo hace; la app valida y explica)
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api', () => ({ getPatients: jest.fn(), getAdministraciones: jest.fn(), getCatalogo: jest.fn(), createAdministracion: jest.fn() }));

const api = require('../src/api');
const { useAuth } = require('../src/context/AuthContext');
const Medicacion = require('../src/screens/Medicacion').default;

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const montar = async () => {
  let r;
  await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}><Medicacion /></SafeAreaProvider>); });
  await flush();
  return r;
};
const texto = (r) => JSON.stringify(r.toJSON());
const campo = (r, label) => r.root.findAll((n) => n.props.label === label && typeof n.props.onChangeText === 'function')[0];
const select = (r, label) => r.root.findAll((n) => n.props.label === label && typeof n.props.onChange === 'function')[0];
const boton = (r, title) => r.root.findAll((n) => n.props.title === title && typeof n.props.onPress === 'function')[0];
const err = (status, message, code) => Object.assign(new Error(message), { status, code });

const PACIENTES = [{ id: 9, name: 'Paciente Demo Medicación' }];
const CATALOGO = [{ id: 12, nombre: 'Paracetamol', concentracion: '500 mg', via: 'Oral', stock: 13 }, { id: 13, nombre: 'Ketorolaco', concentracion: '30 mg', stock: 0 }];

async function capturar(r, valores) {
  await act(async () => select(r, 'Paciente').props.onChange('9'));
  await flush();
  await act(async () => boton(r, 'Registrar administración').props.onPress());
  await flush();
  await act(async () => select(r, 'Medicamento').props.onChange('12'));
  for (const [label, v] of Object.entries(valores)) act(() => campo(r, label).props.onChangeText(v));
}
const guardar = (r) => act(async () => { await boton(r, 'Guardar').props.onPress(); });

describe('Medicación: administración con descuento de inventario (T-35.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuth.mockReturnValue({ user: { rol: 'enfermeria' }, can: (...roles) => roles.includes('enfermeria') });
    api.getPatients.mockResolvedValue(PACIENTES);
    api.getAdministraciones.mockResolvedValue([]);
    api.getCatalogo.mockResolvedValue(CATALOGO);
  });

  test('el catálogo muestra el stock de farmacia de cada medicamento', async () => {
    const r = await montar();
    await act(async () => boton(r, 'Registrar administración').props.onPress());
    await flush();
    const opciones = select(r, 'Medicamento').props.options.map((o) => o.label);
    expect(opciones).toEqual(['Paracetamol 500 mg · 13 u.', 'Ketorolaco 30 mg · sin stock']);
    act(() => r.unmount());
  });

  test('envía las unidades (1 por defecto) y avisa cuántas se descontaron y cuántas quedan', async () => {
    api.createAdministracion.mockResolvedValue({ id: 5, stockNuevo: 12, unidades: 1 });
    const r = await montar();
    await capturar(r, { Dosis: '500 mg' });
    const consultas = api.getAdministraciones.mock.calls.length;
    await guardar(r);
    await flush();
    expect(api.createAdministracion).toHaveBeenCalledWith(expect.objectContaining({ pacienteId: 9, medicamentoId: 12, dosis: '500 mg', unidades: 1 }));
    expect(Alert.alert).toHaveBeenCalledWith('Listo', 'Administración registrada. Se descontaron 1 u. del inventario. Quedan 12 u. en farmacia.');
    expect(api.getAdministraciones.mock.calls.length).toBeGreaterThan(consultas);
    act(() => r.unmount());
  });

  test('el campo de unidades solo acepta dígitos y valida de 1 a 20 antes de llamar a la API', async () => {
    const r = await montar();
    await capturar(r, { Dosis: '1 g' });
    act(() => campo(r, 'Unidades a descontar').props.onChangeText('2a'));
    expect(campo(r, 'Unidades a descontar').props.value).toBe('2');
    for (const v of ['0', '21', '']) {
      act(() => campo(r, 'Unidades a descontar').props.onChangeText(v));
      await guardar(r);
      expect(texto(r)).toContain('Las unidades a descontar deben ser un número entero de 1 a 20.');
    }
    expect(api.createAdministracion).not.toHaveBeenCalled();
    act(() => r.unmount());
  });

  test('valida la longitud de dosis, vía y observaciones como la API (T-35.1)', async () => {
    const r = await montar();
    await capturar(r, { Dosis: 'x'.repeat(51) });
    await guardar(r);
    expect(texto(r)).toContain('La dosis no puede superar 50 caracteres.');
    act(() => campo(r, 'Dosis').props.onChangeText('1 g'));
    act(() => campo(r, 'Vía (opcional)').props.onChangeText('v'.repeat(51)));
    await guardar(r);
    expect(texto(r)).toContain('La vía no puede superar 50 caracteres.');
    act(() => campo(r, 'Vía (opcional)').props.onChangeText(''));
    act(() => campo(r, 'Observaciones').props.onChangeText('o'.repeat(1001)));
    await guardar(r);
    expect(texto(r)).toContain('Las observaciones no pueden superar 1000 caracteres.');
    expect(api.createAdministracion).not.toHaveBeenCalled();
    act(() => r.unmount());
  });

  test('sin stock: explica cuánto hay y pide avisar a farmacia', async () => {
    api.createAdministracion.mockRejectedValue(err(409, 'Sin stock suficiente de Paracetamol. Disponible: 0', 'SIN_STOCK'));
    const r = await montar();
    await capturar(r, { Dosis: '500 mg' });
    await guardar(r);
    expect(texto(r)).toContain('Sin stock suficiente de Paracetamol. Disponible: 0 Avisa a farmacia para que surta el medicamento.');
    expect(Alert.alert).not.toHaveBeenCalled();
    act(() => r.unmount());
  });

  test('paciente sin cama: mensaje claro de por qué no se registró', async () => {
    api.createAdministracion.mockRejectedValue(err(409, 'El paciente no está hospitalizado', 'NO_HOSPITALIZADO'));
    const r = await montar();
    await capturar(r, { Dosis: '500 mg' });
    await guardar(r);
    expect(texto(r)).toContain('El paciente no tiene cama asignada. Solo se registran administraciones de pacientes hospitalizados.');
    act(() => r.unmount());
  });

  test('un error 500 no muestra detalles técnicos', async () => {
    api.createAdministracion.mockRejectedValue(err(500, 'ER_LOCK_WAIT_TIMEOUT en lotes'));
    const r = await montar();
    await capturar(r, { Dosis: '500 mg' });
    await guardar(r);
    expect(texto(r)).not.toContain('ER_LOCK');
    expect(texto(r)).toContain('El servicio no está disponible por ahora');
    act(() => r.unmount());
  });

  test('médico y farmacia no ven el botón para registrar', async () => {
    useAuth.mockReturnValue({ user: { rol: 'medico' }, can: (...roles) => roles.includes('medico') });
    const r = await montar();
    expect(boton(r, 'Registrar administración')).toBeUndefined();
    act(() => r.unmount());
  });
});
