// Rediseño de Inicio, Pacientes y Signos vitales (maqueta de diseño).
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api', () => ({
  getStats: jest.fn(),
  getFarmaciaResumen: jest.fn(),
  getEmergenciasActivas: jest.fn(() => Promise.resolve([])),
  atenderEmergencia: jest.fn(),
  getPatients: jest.fn(),
  getPatient: jest.fn(),
  getSignos: jest.fn(),
  createSignos: jest.fn(),
}));

const api = require('../src/api');
const { useAuth } = require('../src/context/AuthContext');
const { MenuContext } = require('../src/navigation/menuContext');
const { saludo, fechaCorta, horaMinutos, primerNombre, iniciales } = require('../src/utils/fecha');
const { tendencia, rangoNormal } = require('../src/utils/signosVitales');
const Dashboard = require('../src/screens/Dashboard').default;
const { accesosRapidos } = require('../src/screens/Dashboard');
const Patients = require('../src/screens/Patients').default;
const SignosVitales = require('../src/screens/SignosVitales').default;
const { TriageBadge } = require('../src/components/ui');

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const canPara = (rol) => (...roles) => rol === 'administrador' || roles.includes(rol);
const texto = (r) => JSON.stringify(r.toJSON());
const flush = () => act(async () => { await new Promise((res) => setTimeout(res, 0)); });
async function montar(el, menu = null) {
  let r;
  await act(async () => {
    r = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}><MenuContext.Provider value={menu}>{el}</MenuContext.Provider></SafeAreaProvider>,
    );
  });
  await flush();
  return r;
}
const porLabel = (r, l) => r.root.findAll((n) => n.props.accessibilityLabel === l && typeof n.props.onPress === 'function')[0];

beforeEach(() => jest.clearAllMocks());

describe('utilidades de fecha', () => {
  const a = (h) => new Date(2026, 9, 29, h, 5);
  test('el saludo depende de la hora (ya no dice siempre "Buen día")', () => {
    expect(saludo(a(4))).toBe('Buenas noches');
    expect(saludo(a(5))).toBe('Buenos días');
    expect(saludo(a(11))).toBe('Buenos días');
    expect(saludo(a(12))).toBe('Buenas tardes');
    expect(saludo(a(18))).toBe('Buenas tardes');
    expect(saludo(a(19))).toBe('Buenas noches');
  });
  test('fecha corta y hora', () => {
    expect(fechaCorta(new Date(2026, 9, 29))).toBe('Jue 29 oct');
    expect(fechaCorta(new Date(2026, 0, 4))).toBe('Dom 4 ene');
    expect(horaMinutos(a(7))).toBe('07:05');
  });
  test('primer nombre e iniciales ignoran títulos', () => {
    expect(primerNombre('Dr. Luis Romero')).toBe('Luis');
    expect(primerNombre('')).toBe('Usuario');
    expect(iniciales('Ana López')).toBe('AL');
    expect(iniciales('Enf. Carmen Ruiz Díaz')).toBe('CR');
    expect(iniciales(null)).toBe('U');
  });
});

describe('Inicio', () => {
  test('saludo con el primer nombre, resumen en mosaicos y accesos rápidos', async () => {
    useAuth.mockReturnValue({ user: { nombre: 'Ana López', rol: 'enfermeria' }, can: canPara('enfermeria') });
    api.getStats.mockResolvedValue({ totalPatients: 202, redCount: 2, yellowCount: 5, greenCount: 9 });
    const irA = jest.fn();
    const r = await montar(<Dashboard />, { abrir: jest.fn(), irA });
    const t = texto(r);
    expect(t).toMatch(/Buen(os|as) (días|tardes|noches)/);
    expect(t).toContain('Ana');
    expect(t).not.toContain('BUEN DÍA');
    expect(t).toContain(fechaCorta(new Date()));
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Pacientes registrados: 202').length).toBeGreaterThan(0);
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Crítico: 2, Nivel I').length).toBeGreaterThan(0);
    expect(t).toContain('Accesos rápidos');
    act(() => porLabel(r, 'Signos vitales').props.onPress());
    expect(irA).toHaveBeenCalledWith('SignosVitales');
    act(() => porLabel(r, 'Ver pacientes').props.onPress());
    expect(irA).toHaveBeenCalledWith('Patients');
    act(() => r.unmount());
  });
  test('farmacia ve su resumen y sus propios accesos', async () => {
    useAuth.mockReturnValue({ user: { nombre: 'Luis', rol: 'farmacia' }, can: canPara('farmacia') });
    api.getFarmaciaResumen.mockResolvedValue({ totalMedicamentos: 40, stockBajo: 3, sinStock: 1, lotesPorCaducar: 2, lotesCaducados: 0 });
    const r = await montar(<Dashboard />, { abrir: jest.fn(), irA: jest.fn() });
    const t = texto(r);
    expect(t).toContain('Resumen de farmacia');
    expect(t).toContain('Medicamentos activos');
    expect(t).not.toContain('Pacientes registrados');
    expect(api.getEmergenciasActivas).not.toHaveBeenCalled();
    act(() => r.unmount());
  });
  test('los accesos rápidos dependen del rol (máximo 4)', () => {
    expect(accesosRapidos(canPara('enfermeria')).map((m) => m.id)).toEqual(['Patients', 'Triage', 'SignosVitales', 'Medicacion']);
    expect(accesosRapidos(canPara('farmacia')).map((m) => m.id)).toEqual(['Existencias', 'Movimientos', 'Medicamentos', 'AlertasFarmacia']);
    expect(accesosRapidos(canPara('medico')).length).toBe(4);
  });
  test('si la API falla se avisa "Sin actualizar" en lugar de "En línea"', async () => {
    useAuth.mockReturnValue({ user: { nombre: 'Ana', rol: 'medico' }, can: canPara('medico') });
    api.getStats.mockRejectedValue(Object.assign(new Error('x'), { status: 0 }));
    const r = await montar(<Dashboard />, { abrir: jest.fn(), irA: jest.fn() });
    expect(texto(r)).toContain('Sin actualizar');
    act(() => r.unmount());
  });
});

describe('Pacientes', () => {
  const LISTA = [
    { id: 1, name: 'Jorge Castillo Peña', age: 67, sexo: 'hombre', triageLevel: 'naranja' },
    { id: 2, name: 'Paola Ríos Aguilar', age: 29, sexo: 'mujer', triageLevel: null },
  ];
  const props = { navigation: { navigate: jest.fn(), setParams: jest.fn() }, route: { params: {} } };

  test('cada paciente muestra iniciales y su nivel de triage con número y texto', async () => {
    api.getPatients.mockResolvedValue(LISTA);
    const r = await montar(<Patients {...props} />);
    const t = texto(r);
    expect(t).toContain('JC');
    expect(t).toContain('II · Muy urgente');
    expect(t).toContain('Sin triage');
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Triage nivel II, Muy urgente').length).toBeGreaterThan(0);
    expect(t).toContain('2 pacientes');
  });
  test('los filtros por nivel piden a la API solo ese nivel y el vacío explica qué pasa', async () => {
    api.getPatients.mockResolvedValue(LISTA);
    const r = await montar(<Patients {...props} />);
    api.getPatients.mockResolvedValue([]);
    await act(async () => { porLabel(r, 'I Crítico').props.onPress(); });
    await flush();
    expect(api.getPatients).toHaveBeenLastCalledWith('', 'rojo');
    expect(porLabel(r, 'I Crítico').props.accessibilityState.selected).toBe(true);
    expect(texto(r)).toContain('Sin pacientes en I Crítico');
    api.getPatients.mockResolvedValue(LISTA);
    await act(async () => { porLabel(r, 'Ver todos los pacientes').props.onPress(); });
    await flush();
    expect(api.getPatients).toHaveBeenLastCalledWith('');
  });
  test('mientras carga muestra filas de esqueleto, no un spinner', async () => {
    api.getPatients.mockReturnValue(new Promise(() => {}));
    let r;
    await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}><Patients {...props} /></SafeAreaProvider>); });
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Cargando').length).toBeGreaterThan(0);
  });
  test('TriageBadge sin nivel conocido dice "Sin triage"', () => {
    let r;
    act(() => { r = ReactTestRenderer.create(<TriageBadge nivel="morado" />); });
    expect(texto(r)).toContain('Sin triage');
  });
});

describe('Signos vitales', () => {
  test('tendencia y rango normal', () => {
    expect(tendencia('temperatura', 37.9)).toBe('alto');
    expect(tendencia('saturacionOxigeno', 91)).toBe('bajo');
    expect(tendencia('frecuenciaCardiaca', 80)).toBeNull();
    expect(tendencia('presionArterial', '150/95')).toBe('alto');
    expect(tendencia('presionArterial', '85/55')).toBe('bajo');
    expect(tendencia('presionArterial', 'x')).toBeNull();
    expect(rangoNormal('temperatura')).toBe('36.1–37.5');
    expect(rangoNormal('presionArterial')).toBe('90–139/60–89');
  });
  test('al elegir paciente: encabezado con alergias y mosaicos de la última toma con flecha', async () => {
    useAuth.mockReturnValue({ user: { rol: 'enfermeria' }, can: canPara('enfermeria') });
    api.getPatients.mockResolvedValue([{ id: 9, name: 'Laura Méndez Ortega', age: 52, sexo: 'mujer' }]);
    api.getPatient.mockResolvedValue({ id: 9, alergias: 'Penicilina' });
    api.getSignos.mockResolvedValue([
      { id: 2, paciente: 'Laura Méndez Ortega', temperatura: 37.9, fc: 98, spo2: 95, presion: '124/80', fecha: '2026-10-29 22:41:00', registradoPor: 'Enf. Ana López' },
    ]);
    const r = await montar(<SignosVitales />);
    await act(async () => { r.root.findAll((n) => n.props.label === 'Paciente' && typeof n.props.onChange === 'function')[0].props.onChange('9'); });
    await flush();
    const t = texto(r);
    expect(t).toContain('Alergia: ');
    expect(t).toContain('Penicilina');
    expect(t).toContain('Última toma');
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Temperatura: 37.9 °C, alto, fuera del rango normal').length).toBeGreaterThan(0);
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Frec. cardiaca: 98 lpm').length).toBeGreaterThan(0);
    expect(t).toContain('36.1–37.5');
    expect(t).toContain('Historial');
    act(() => r.unmount());
  });
});
