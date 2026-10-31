// Tema claro / oscuro: paletas legibles, cambio de tema, preferencia guardada y selector "Apariencia".
import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockKeychain = { getGenericPassword: jest.fn(), setGenericPassword: jest.fn() };
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => mockKeychain);
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));

const { useAuth } = require('../src/context/AuthContext');
const { PALETAS, TRIAGE_INSIGNIA, colors, aplicarTema, conTema, contraste } = require('../src/theme/paletas');
const { TemaProvider, useTema, modoEfectivo } = require('../src/theme/TemaContext');
const { leerTema, guardarTema } = require('../src/services/preferencias');
const { MenuProvider } = require('../src/navigation/MenuLateral');
const { BotonMenu, Card } = require('../src/components/ui');
const Login = require('../src/screens/Login').default;

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const texto = (r) => JSON.stringify(r.toJSON());

afterEach(() => aplicarTema('claro'));

describe('paletas', () => {
  // WCAG AA: 4.5:1 para texto normal
  const PARES = [
    ['text', 'bg'], ['text', 'surface'], ['sub', 'surface'], ['sub', 'bg'], ['faint', 'surface'], ['label', 'surface'],
    ['tealDeep', 'mint'], ['tealDeep', 'surface'], ['onPrimary', 'teal'], ['dangerText', 'dangerTint'], ['onDanger', 'danger'],
    ['warning', 'warningTint'], ['success', 'successTint'], ['coral', 'surface'], ['amber', 'surface'], ['emergencyText', 'emergencyTint'], ['online', 'surface'],
  ];
  test.each(['claro', 'oscuro'])('tema %s: todos los textos tienen contraste AA (4.5:1) sobre su fondo', (modo) => {
    const p = PALETAS[modo];
    const malos = PARES.filter(([a, b]) => contraste(p[a], p[b]) < 4.5).map(([a, b]) => `${a}/${b}=${contraste(p[a], p[b]).toFixed(2)}`);
    expect(malos).toEqual([]);
  });
  test.each(['claro', 'oscuro'])('tema %s: las insignias de triage son legibles', (modo) => {
    Object.values(TRIAGE_INSIGNIA[modo]).forEach((t) => expect(contraste(t.text, t.bg)).toBeGreaterThanOrEqual(4.5));
  });
  test('ambas paletas tienen exactamente los mismos nombres de color', () => {
    expect(Object.keys(PALETAS.oscuro).sort()).toEqual(Object.keys(PALETAS.claro).sort());
  });
  test('el rojo de peligro sigue siendo el de la marca en tema claro', () => {
    expect(PALETAS.claro.danger).toBe('#DC2626');
  });
});

describe('aplicarTema y conTema', () => {
  test('aplicarTema cambia el MISMO objeto colors (las pantallas lo leen en cada render)', () => {
    const ref = colors;
    aplicarTema('oscuro');
    expect(ref.bg).toBe('#0D1222');
    expect(ref.modo).toBe('oscuro');
    aplicarTema('claro');
    expect(ref.bg).toBe('#F5F6FA');
  });
  test('un tema desconocido usa el claro', () => {
    aplicarTema('morado');
    expect(colors.modo).toBe('claro');
  });
  test('conTema calcula los estilos una vez por tema', () => {
    const fabrica = jest.fn((c) => ({ fondo: c.bg }));
    const estilos = conTema(fabrica);
    expect(estilos().fondo).toBe('#F5F6FA');
    estilos();
    aplicarTema('oscuro');
    expect(estilos().fondo).toBe('#0D1222');
    estilos();
    expect(fabrica).toHaveBeenCalledTimes(2);
  });
  test('modoEfectivo: "auto" sigue al teléfono; claro y oscuro son fijos', () => {
    expect(modoEfectivo('auto', 'dark')).toBe('oscuro');
    expect(modoEfectivo('auto', 'light')).toBe('claro');
    expect(modoEfectivo('auto', null)).toBe('claro');
    expect(modoEfectivo('claro', 'dark')).toBe('claro');
    expect(modoEfectivo('oscuro', 'light')).toBe('oscuro');
  });
});

describe('preferencia guardada', () => {
  beforeEach(() => jest.clearAllMocks());
  test('lee solo valores válidos', async () => {
    mockKeychain.getGenericPassword.mockResolvedValueOnce({ password: 'oscuro' });
    expect(await leerTema()).toBe('oscuro');
    mockKeychain.getGenericPassword.mockResolvedValueOnce({ password: 'rosa' });
    expect(await leerTema()).toBeNull();
    mockKeychain.getGenericPassword.mockRejectedValueOnce(new Error('keystore'));
    expect(await leerTema()).toBeNull();
  });
  test('guarda en su propio servicio (no toca el token de sesión) e ignora valores inválidos', async () => {
    await guardarTema('claro');
    expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith('tema', 'claro', { service: 'healthnexus.preferencias.tema' });
    await guardarTema('cualquiera');
    expect(mockKeychain.setGenericPassword).toHaveBeenCalledTimes(1);
  });
  test('TemaProvider aplica la preferencia guardada al abrir la app', async () => {
    mockKeychain.getGenericPassword.mockResolvedValueOnce({ password: 'oscuro' });
    let visto;
    const Espia = () => { visto = useTema().modo; return null; };
    let r;
    await act(async () => { r = ReactTestRenderer.create(<TemaProvider><Espia /></TemaProvider>); });
    expect(visto).toBe('oscuro');
    expect(colors.bg).toBe('#0D1222');
    act(() => r.unmount());
  });
});

describe('pantallas en tema oscuro', () => {
  test('Login usa el fondo y las superficies oscuras', () => {
    jest.useFakeTimers();
    useAuth.mockReturnValue({ login: jest.fn() });
    let r;
    act(() => {
      r = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}><TemaProvider inicial="oscuro"><Login /></TemaProvider></SafeAreaProvider>,
      );
    });
    const t = texto(r);
    expect(t).toContain(PALETAS.oscuro.bg);
    expect(t).toContain(PALETAS.oscuro.surface);
    expect(t).not.toContain(PALETAS.claro.bg);
    act(() => r.unmount());
    jest.useRealTimers();
  });
  test('Card cambia de superficie con el tema', () => {
    let oscuro, claro;
    act(() => { oscuro = ReactTestRenderer.create(<TemaProvider inicial="oscuro"><Card><Text>x</Text></Card></TemaProvider>); });
    expect(texto(oscuro)).toContain(PALETAS.oscuro.surface);
    act(() => { claro = ReactTestRenderer.create(<TemaProvider inicial="claro"><Card><Text>x</Text></Card></TemaProvider>); });
    expect(texto(claro)).toContain(PALETAS.claro.surface);
  });
});

describe('Apariencia en la barra lateral', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  test('muestra Auto/Claro/Oscuro; al elegir Oscuro cambia el tema y se guarda', () => {
    useAuth.mockReturnValue({ user: { nombre: 'Ana López', rol: 'enfermeria' }, can: () => true, logout: jest.fn() });
    let r;
    act(() => {
      r = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <TemaProvider inicial="claro">
            <MenuProvider navigationRef={{ current: { isReady: () => true, reset: jest.fn() } }} rutaActual="Dashboard">
              <BotonMenu />
            </MenuProvider>
          </TemaProvider>
        </SafeAreaProvider>,
      );
    });
    act(() => { r.root.findAll((n) => n.props.accessibilityLabel === 'Abrir menú' && typeof n.props.onPress === 'function')[0].props.onPress(); jest.runAllTimers(); });
    const opcion = (nombre) => r.root.findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === nombre)[0];
    expect(texto(r)).toContain('Apariencia');
    ['Auto', 'Claro', 'Oscuro'].forEach((n) => expect(opcion(n)).toBeTruthy());
    expect(opcion('Claro').props.accessibilityState.checked).toBe(true);

    const { Appearance } = require('react-native');
    const forzar = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    act(() => opcion('Oscuro').props.onPress());
    expect(colors.modo).toBe('oscuro');
    expect(forzar).toHaveBeenLastCalledWith('dark'); // los diálogos nativos también se ven oscuros
    expect(opcion('Oscuro').props.accessibilityState.checked).toBe(true);
    expect(texto(r)).toContain('Siempre oscuro');
    expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith('tema', 'oscuro', expect.any(Object));
    act(() => opcion('Auto').props.onPress());
    expect(forzar).toHaveBeenLastCalledWith('unspecified'); // vuelve a seguir al teléfono
    act(() => r.unmount());
  });
});
