// Pantallas de cualquier tamaño: celular, tablet, horizontal y pantalla dividida.
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Tamaño de la ventana que ven los componentes; cada prueba lo cambia con `ventana(...)`
let mockVentana = { width: 412, height: 915, scale: 2, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({ __esModule: true, default: () => mockVentana }));
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn(() => ({ login: jest.fn(), verificarPin: jest.fn() })) }));
jest.mock('../src/api', () => ({
  getPatients: jest.fn(() => Promise.resolve([])),
  getStats: jest.fn(() => Promise.resolve({})),
  getFarmaciaResumen: jest.fn(),
  getEmergenciasActivas: jest.fn(() => Promise.resolve([])),
}));

const D = require('../src/utils/disposicion');
const api = require('../src/api');
const { useAuth } = require('../src/context/AuthContext');
const { Rejilla, Screen } = require('../src/components/ui');
const Login = require('../src/screens/Login').default;
const Patients = require('../src/screens/Patients').default;
const Dashboard = require('../src/screens/Dashboard').default;

const ventana = (width, height) => { mockVentana = { width, height, scale: 2, fontScale: 1 }; };
const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
async function montar(el) {
  let r;
  await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); });
  await act(async () => { await new Promise((res) => setTimeout(res, 0)); });
  return r;
}
/** Estilo del contenido del primer ScrollView vertical de la pantalla */
const contenido = (r) => StyleSheet.flatten(r.root.findAll((n) => n.props.contentContainerStyle && !n.props.horizontal)[0].props.contentContainerStyle);

beforeEach(() => ventana(412, 915));

describe('disposicion()', () => {
  test('celular: 1 columna y el contenido usa todo el ancho', () => {
    const d = D.disposicion({ width: 412, height: 915 }, { amplio: true });
    expect(d).toMatchObject({ esTablet: false, horizontal: false, columnas: 1, anchoContenido: 372, anchoColumna: 372 });
  });

  test('tablet vertical: las listas van a 2 columnas', () => {
    const d = D.disposicion({ width: 800, height: 1280 }, { amplio: true });
    expect(d).toMatchObject({ esTablet: true, columnas: 2, anchoContenido: 760, anchoColumna: 374 });
  });

  test('tablet chica (600 dp): cada tarjeta quedaría muy angosta, así que sigue en 1 columna', () => {
    expect(D.disposicion({ width: 600, height: 960 }, { amplio: true }).columnas).toBe(1);
  });

  test('celular en horizontal: hay espacio para 2 columnas', () => {
    const d = D.disposicion({ width: 915, height: 412 }, { amplio: true });
    expect(d).toMatchObject({ horizontal: true, esTablet: false, columnas: 2 });
  });

  test('pantalla muy ancha: nunca más de 2 columnas ni más de 1100 dp', () => {
    const d = D.disposicion({ width: 1920, height: 1080 }, { amplio: true });
    expect(d).toMatchObject({ columnas: 2, anchoMaximo: 1100, anchoContenido: 1060 });
  });

  test('formularios y detalles: siempre 1 columna, como máximo 720 dp', () => {
    const d = D.disposicion({ width: 1280, height: 800 });
    expect(d).toMatchObject({ columnas: 1, anchoMaximo: 720, anchoContenido: 680, esTablet: true });
  });

  test('tablet = lado corto de 600 dp o más (criterio de Android)', () => {
    expect(D.disposicion({ width: 599, height: 900 }).esTablet).toBe(false);
    expect(D.disposicion({ width: 900, height: 600 }).esTablet).toBe(true);
  });

  test('sin tamaño (primer render) no truena', () => {
    expect(D.disposicion()).toMatchObject({ columnas: 1, anchoContenido: 0 });
  });

  test('enFilas reparte la lista y deja incompleta solo la última fila', () => {
    expect(D.enFilas([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(D.enFilas([1, 2], 1)).toEqual([[1], [2]]);
    expect(D.enFilas([], 2)).toEqual([]);
  });
});

describe('ancho máximo del contenido', () => {
  test('Screen se centra con 720 dp como máximo', async () => {
    ventana(1280, 800);
    const r = await montar(<Screen title="Prueba"><Text>hola</Text></Screen>);
    expect(contenido(r)).toMatchObject({ width: '100%', maxWidth: 720, alignSelf: 'center' });
  });

  test('Screen amplio (listas) llega hasta 1100 dp', async () => {
    ventana(1280, 800);
    const r = await montar(<Screen title="Lista" amplio><Text>hola</Text></Screen>);
    expect(contenido(r).maxWidth).toBe(1100);
  });

  test('en celular el tope no cambia nada: el contenido ocupa todo el ancho', async () => {
    const r = await montar(<Screen title="Prueba"><Text>hola</Text></Screen>);
    expect(contenido(r)).toMatchObject({ width: '100%', padding: 20 });
  });

  test('el inicio de sesión no se estira en tablets', async () => {
    ventana(1280, 800);
    const r = await montar(<Login />);
    expect(contenido(r)).toMatchObject({ maxWidth: D.ANCHO_TARJETA + 48, alignSelf: 'center' });
  });
});

describe('listas en 2 columnas (Rejilla)', () => {
  const tarjetas = (n) => Array.from({ length: n }, (_, i) => <Text key={`t${i}`}>Tarjeta {i + 1}</Text>);
  const filas = (r) => r.root.findAll((n) => n.props.testID === 'rejilla-fila' && typeof n.type !== 'string');

  test('en celular no agrega nada: las tarjetas quedan una debajo de otra', async () => {
    const r = await montar(<Screen title="Lista" amplio><Rejilla>{tarjetas(3)}</Rejilla></Screen>);
    expect(filas(r)).toHaveLength(0);
    expect(r.root.findAllByType(Text).filter((t) => String(t.props.children[0]).startsWith('Tarjeta'))).toHaveLength(3);
  });

  test('en tablet acomoda las tarjetas de 2 en 2 y la última fila guarda el ancho de columna', async () => {
    ventana(800, 1280);
    const r = await montar(<Screen title="Lista" amplio><Rejilla>{tarjetas(3)}</Rejilla></Screen>);
    const f = filas(r);
    expect(f).toHaveLength(2);
    expect(f[0].props.children[0]).toHaveLength(2);
    expect(f[1].props.children[0]).toHaveLength(1);
    expect(f[1].props.children[1]).toHaveLength(1); // hueco para que la tarjeta no se estire
  });

  test('en una pantalla sin "amplio" (formulario) sigue en 1 columna aunque sea tablet', async () => {
    ventana(800, 1280);
    const r = await montar(<Screen title="Formulario"><Rejilla>{tarjetas(4)}</Rejilla></Screen>);
    expect(filas(r)).toHaveLength(0);
  });

  test('Pacientes en tablet: lista en 2 columnas', async () => {
    ventana(800, 1280);
    api.getPatients.mockResolvedValue([
      { id: 1, name: 'Ana López', age: 30, sexo: 'mujer', triageLevel: 'verde' },
      { id: 2, name: 'Beto Ruiz', age: 41, sexo: 'hombre', triageLevel: 'rojo' },
    ]);
    const r = await montar(<Patients navigation={{ navigate: jest.fn(), setParams: jest.fn() }} route={{ params: {} }} />);
    expect(contenido(r).maxWidth).toBe(1100);
    expect(filas(r)).toHaveLength(1);
    expect(JSON.stringify(r.toJSON())).toContain('Beto Ruiz');
  });

  test('Inicio en tablet: los 4 accesos rápidos van en una sola fila', async () => {
    useAuth.mockReturnValue({ user: { nombre: 'Ana López', rol: 'administrador' }, can: () => true });
    const accesos = (r) => r.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.style === 'function' && n.props.accessibilityLabel !== 'Abrir menú');
    const base = (r) => StyleSheet.flatten(accesos(r)[0].props.style({ pressed: false }));

    const celular = await montar(<Dashboard />);
    expect(base(celular).flexBasis).toBe('45%');

    ventana(1280, 800);
    const tablet = await montar(<Dashboard />);
    expect(base(tablet).flexBasis).toBe('22%');
  });
});
