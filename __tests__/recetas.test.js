// Dispensación de recetas en la app: lista para farmacia, detalle, dispensar (descuenta inventario en la API) y revertir.
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockNavigate = jest.fn();
const mockListeners = {};
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate, addListener: (ev, fn) => { mockListeners[ev] = fn; return () => {}; } }),
}));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api', () => ({
  getRecetas: jest.fn(), getRecetasResumen: jest.fn(), getReceta: jest.fn(), dispensarReceta: jest.fn(), revertirDispensacion: jest.fn(),
}));

const api = require('../src/api');
const { useAuth } = require('../src/context/AuthContext');
const Recetas = require('../src/screens/Recetas').default;
const { resumenReceta } = require('../src/screens/Recetas');
const RecetaDetalle = require('../src/screens/RecetaDetalle').default;
const { unidadesParaApi } = require('../src/screens/RecetaDetalle');
const { MODULOS, seccionesVisibles } = require('../src/navigation/modulos');
const { accesosRapidos } = require('../src/screens/Dashboard');

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const montar = async (el) => { let r; await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); }); await flush(); return r; };
const hojas = (n) => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(hojas).join('') : hojas(n.children));
const texto = (r) => hojas(r.toJSON());
const boton = (r, title) => r.root.findAll((n) => n.props.title === title && typeof n.props.onPress === 'function')[0];
const porEtiqueta = (r, label) => r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
const err = (status, message, code) => Object.assign(new Error(message), { status, code });
const como = (rol) => useAuth.mockReturnValue({ user: { id: 1, rol }, can: (...roles) => rol === 'administrador' || roles.includes(rol) });
// Pulsa el botón indicado del Alert de confirmación que se mostró
const confirmar = async (alerta, opcion) => {
  const botones = alerta.mock.calls.at(-1)[2];
  await act(async () => { await botones.find((b) => b.text === opcion).onPress(); });
  await flush();
};

const FILA = { id: 77, pacienteId: 5, paciente: 'Ana López', curp: null, medico: 'Dr. Ruiz', fecha: '2026-11-10 09:30:00', medicamentos: 2, recetaLibre: false, dispensada: false, dispensadaEn: null, dispensadaPor: null };
const DETALLE = {
  id: 77, pacienteId: 5, paciente: 'Ana López', curp: 'LOPA900101MMCRPN01', medico: 'Dr. Ruiz', diagnostico: 'Faringitis', fecha: '2026-11-10 09:30:00',
  recetaLibre: 'Reposo 3 días', dispensada: false, dispensadaEn: null, dispensadaPor: null, notasDispensacion: null,
  medicamentos: [
    { medicamentoId: 12, nombre: 'Paracetamol', presentacion: 'Tabletas', concentracion: '500 mg', dosis: '500 mg', via: 'Oral', frecuencia: 'Cada 8 horas', duracion: '5 días', indicaciones: null, controlado: false, disponible: 13 },
    { medicamentoId: 30, nombre: 'Amoxicilina', presentacion: 'Cápsulas', concentracion: '500 mg', dosis: '500 mg', via: 'Oral', frecuencia: 'Cada 12 horas', duracion: '7 días', indicaciones: 'Con alimentos', controlado: false, disponible: 1 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  como('farmacia');
  api.getRecetasResumen.mockResolvedValue({ pendientes: 4, dispensadasHoy: 2, dispensadasMes: 9 });
  api.getRecetas.mockResolvedValue({ total: 1, page: 1, limit: 20, data: [FILA] });
  api.getReceta.mockResolvedValue(DETALLE);
});

describe('menú y accesos', () => {
  test('Recetas aparece en la sección de farmacia solo para farmacia y administrador', () => {
    const can = (rol) => (...roles) => rol === 'administrador' || roles.includes(rol);
    const ids = (rol) => seccionesVisibles(can(rol)).flatMap((s) => s.modulos.map((m) => m.id));
    expect(MODULOS.find((m) => m.id === 'Recetas').seccion).toBe('farmacia');
    expect(ids('farmacia')).toContain('Recetas');
    expect(ids('administrador')).toContain('Recetas');
    expect(ids('medico')).not.toContain('Recetas');
    expect(ids('enfermeria')).not.toContain('Recetas');
    expect(accesosRapidos(can('farmacia'))[0].id).toBe('Recetas');
  });
});

describe('lista de recetas', () => {
  test('muestra los contadores, la receta pendiente y al tocarla abre el detalle', async () => {
    const r = await montar(<Recetas />);
    const t = texto(r);
    expect(api.getRecetas).toHaveBeenCalledWith({ estado: 'pendientes', q: '', page: 1, limit: 20 });
    expect(t).toContain('Ana López');
    expect(t).toContain('2 medicamentos');
    expect(t).toContain('Pendiente');
    expect(r.root.findAllByProps({ accessibilityLabel: 'Pendientes: 4' }).length).toBeGreaterThan(0);
    act(() => porEtiqueta(r, 'Receta 77 de Ana López').props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('RecetaDetalle', { id: 77 });
  });

  test('el filtro "Dispensadas" pide estado=dispensadas y al volver del detalle se recarga', async () => {
    const r = await montar(<Recetas />);
    await act(async () => porEtiqueta(r, 'Dispensadas').props.onPress());
    await flush();
    expect(api.getRecetas).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'dispensadas', page: 1 }));
    const antes = api.getRecetas.mock.calls.length;
    await act(async () => { mockListeners.focus(); });      // primera vez (al montar): no recarga
    await act(async () => { mockListeners.focus(); });      // regreso del detalle
    await flush();
    expect(api.getRecetas.mock.calls.length).toBe(antes + 1);
    expect(api.getRecetasResumen).toHaveBeenCalledTimes(2);
  });

  test('sin recetas pendientes muestra el aviso; un error se explica', async () => {
    api.getRecetas.mockResolvedValue({ total: 0, page: 1, limit: 20, data: [] });
    expect(texto(await montar(<Recetas />))).toContain('No hay recetas por dispensar.');
    api.getRecetas.mockRejectedValue(err(403, 'No tienes permiso para esta acción'));
    expect(texto(await montar(<Recetas />))).toContain('Tu rol no tiene permiso para esta acción.');
  });

  test('resumen de la receta', () => {
    expect(resumenReceta({ medicamentos: 1, recetaLibre: false })).toBe('1 medicamento');
    expect(resumenReceta({ medicamentos: 0, recetaLibre: true })).toBe('receta libre');
    expect(resumenReceta({ medicamentos: 2, recetaLibre: true })).toBe('2 medicamentos + receta libre');
  });
});

describe('detalle y dispensación', () => {
  test('muestra medicamentos, existencias y receta libre', async () => {
    const t = texto(await montar(<RecetaDetalle route={{ params: { id: 77 } }} />));
    expect(api.getReceta).toHaveBeenCalledWith(77);
    expect(t).toContain('Paracetamol 500 mg');
    expect(t).toContain('500 mg · Oral · Cada 8 horas · 5 días');
    expect(t).toContain('Con alimentos');
    expect(t).toContain('Disponible: 13');
    expect(t).toContain('Reposo 3 días');
    expect(t).toContain('Diagnóstico: Faringitis');
  });

  test('confirma y dispensa enviando solo las unidades distintas de 1; después recarga', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    api.dispensarReceta.mockResolvedValue({ id: 77, dispensada: true, medicamentos: [{ medicamentoId: 12, medicamento: 'Paracetamol', unidades: 2, stockAnterior: 13, stockNuevo: 11, movimientos: [] }, { medicamentoId: 30, medicamento: 'Amoxicilina', unidades: 1, stockAnterior: 1, stockNuevo: 0, movimientos: [] }] });
    const r = await montar(<RecetaDetalle route={{ params: { id: 77 } }} />);
    act(() => porEtiqueta(r, 'Más Paracetamol').props.onPress());
    act(() => r.root.findAll((n) => n.props.label === 'Notas de dispensación (opcional)' && n.props.onChangeText)[0].props.onChangeText('  Entregado al familiar '));
    await act(async () => boton(r, 'Dispensar receta').props.onPress());
    expect(alerta).toHaveBeenLastCalledWith('Dispensar receta', 'Se descontarán 3 unidades del inventario. ¿Continuar?', expect.any(Array));
    expect(api.dispensarReceta).not.toHaveBeenCalled();
    await confirmar(alerta, 'Dispensar');
    expect(api.dispensarReceta).toHaveBeenCalledWith(77, { notas: 'Entregado al familiar', unidades: { 12: 2 } });
    expect(alerta).toHaveBeenLastCalledWith('Receta dispensada', '• Paracetamol: −2 (quedan 11)\n• Amoxicilina: −1 (quedan 0)');
    expect(api.getReceta).toHaveBeenCalledTimes(2);
  });

  test('si la cantidad supera lo disponible avisa y no deja dispensar', async () => {
    const r = await montar(<RecetaDetalle route={{ params: { id: 77 } }} />);
    act(() => porEtiqueta(r, 'Más Amoxicilina').props.onPress());
    expect(texto(r)).toContain('Disponible: 1 (insuficiente)');
    expect(boton(r, 'Dispensar receta').props.disabled).toBe(true);
  });

  test('explica el 409 SIN_STOCK de la API y recarga si otra persona ya la dispensó', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    api.dispensarReceta.mockRejectedValueOnce(err(409, 'Sin stock suficiente de Amoxicilina (disponible: 0, se necesitan: 1)', 'SIN_STOCK'));
    const r = await montar(<RecetaDetalle route={{ params: { id: 77 } }} />);
    await act(async () => boton(r, 'Dispensar receta').props.onPress());
    await confirmar(alerta, 'Dispensar');
    expect(texto(r)).toContain('Sin stock suficiente de Amoxicilina (disponible: 0, se necesitan: 1). Registra una entrada en Movimientos');

    api.dispensarReceta.mockRejectedValueOnce(err(409, 'Esta receta ya fue dispensada', 'YA_DISPENSADA'));
    await act(async () => boton(r, 'Dispensar receta').props.onPress());
    await confirmar(alerta, 'Dispensar');
    expect(texto(r)).toContain('Otra persona ya dispensó esta receta');
    expect(api.getReceta).toHaveBeenCalledTimes(2);
  });

  test('una receta dispensada muestra quién la entregó y solo el administrador puede revertirla', async () => {
    api.getReceta.mockResolvedValue({ ...DETALLE, dispensada: true, dispensadaEn: '2026-11-10 10:05:00', dispensadaPor: 'Farmacia PBL', notasDispensacion: 'Entregado' });
    let r = await montar(<RecetaDetalle route={{ params: { id: 77 } }} />);
    expect(texto(r)).toContain('Dispensada 10/11 10:05 por Farmacia PBL');
    expect(boton(r, 'Dispensar receta')).toBeUndefined();
    expect(boton(r, 'Revertir dispensación')).toBeUndefined();

    como('administrador');
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    api.revertirDispensacion.mockResolvedValue({ id: 77, dispensada: false, devueltos: [{ medicamentoId: 12, medicamento: 'Paracetamol', unidades: 1, stockNuevo: 13 }] });
    r = await montar(<RecetaDetalle route={{ params: { id: 77 } }} />);
    await act(async () => boton(r, 'Revertir dispensación').props.onPress());
    await confirmar(alerta, 'Revertir');
    expect(api.revertirDispensacion).toHaveBeenCalledWith(77);
    expect(alerta).toHaveBeenLastCalledWith('Dispensación revertida', '• Paracetamol: +1');
  });

  test('unidadesParaApi omite las de 1', () => {
    expect(unidadesParaApi({ 12: 1, 30: 1 })).toBeUndefined();
    expect(unidadesParaApi({ 12: 3, 30: 1 })).toEqual({ 12: 3 });
  });
});
