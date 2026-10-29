import React from 'react';
import fs from 'fs';
import path from 'path';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('@react-native-community/geolocation', () => ({}));
jest.mock('../src/api', () => ({ activarEmergencia: jest.fn(() => Promise.resolve({})) }));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));

const { useAuth } = require('../src/context/AuthContext');
const { colors, ErrorBox, Button } = require('../src/components/ui');
const EmergencyButton = require('../src/components/EmergencyButton').default;
const SplashScreen = require('../src/components/SplashScreen').default;
const Login = require('../src/screens/Login').default;
const { version } = require('../package.json');

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 24, left: 0, right: 0, bottom: 34 } };
const render = (el) => {
  let r;
  act(() => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); });
  return r;
};
const texts = (r) => JSON.stringify(r.toJSON());
const flat = (style) => Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));

describe('colores con significado', () => {
  test('peligro, advertencia y correcto son rojo, ámbar y verde (no azul ni lavanda)', () => {
    expect(colors.danger).toBe('#DC2626');
    expect(colors.warning).toBe('#B45309');
    expect(colors.success).toBe('#15803D');
  });
  test('ErrorBox se muestra con el color de peligro', () => {
    const r = render(<ErrorBox message="Falló algo" />);
    expect(texts(r)).toContain('Falló algo');
    expect(texts(r)).toContain(colors.danger);
    expect(texts(r)).not.toContain(colors.coral);
  });
  test('ningún archivo conserva la paleta "tierra" que desentonaba con la marca', () => {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    const viejos = /#(2B221D|F5F1EC|2F5D50|8C3A22|6B5D53|9A8B82|F1EBE5|3FAE7F)/i;
    const culpables = walk(path.join(__dirname, '..', 'src')).filter((f) => f.endsWith('.js') && viejos.test(fs.readFileSync(f, 'utf8')));
    expect(culpables).toEqual([]);
  });
});

describe('Button', () => {
  test('es accesible y responde al toque', () => {
    const onPress = jest.fn();
    const r = render(<Button title="Guardar" onPress={onPress} />);
    const b = r.root.findByProps({ accessibilityRole: 'button' });
    expect(b.props.accessibilityLabel).toBe('Guardar');
    act(() => b.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  test('deshabilitado indica su estado', () => {
    const r = render(<Button title="Guardar" onPress={() => {}} disabled />);
    expect(r.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityState.disabled).toBe(true);
  });
});

describe('SplashScreen', () => {
  test('muestra el logo y un indicador de carga sobre fondo blanco', () => {
    const r = render(<SplashScreen />);
    expect(r.root.findByProps({ accessibilityLabel: 'HealthNexus' })).toBeTruthy();
    expect(texts(r)).toContain('#FFFFFF');
  });
});

describe('EmergencyButton', () => {
  test('no aparece sin sesión', () => {
    useAuth.mockReturnValue({ user: null });
    expect(render(<EmergencyButton />).toJSON().children).toBeNull();
  });
  test('con sesión respeta la barra de navegación del sistema (margen inferior seguro)', () => {
    useAuth.mockReturnValue({ user: { nombre: 'Ana', rol: 'medico' }, can: () => true });
    const r = render(<EmergencyButton />);
    const b = r.root.findByProps({ accessibilityLabel: 'Código de emergencia' });
    const st = flat(b.props.style({ pressed: false }));
    expect(st.bottom).toBe(24 + metrics.insets.bottom);
    expect(st.backgroundColor).toBe('#DC2626');
  });
});

describe('Login', () => {
  // La pantalla tiene animaciones de entrada: se congela el reloj para que no corran durante la prueba
  beforeEach(() => { jest.useFakeTimers(); useAuth.mockReturnValue({ login: jest.fn() }); });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  test('muestra la versión real de la app (package.json)', () => {
    const r = render(<Login />);
    // React reparte "v" y la versión en dos textos hijos: se unen antes de comparar
    expect(texts(r).replace(/","/g, '')).toContain(`v${version}`);
    act(() => r.unmount());
  });
  test('usa la paleta de marca y deja espacio bajo la barra de estado', () => {
    const r = render(<Login />);
    const j = texts(r);
    expect(j).toContain(colors.tealDeep);
    expect(j).toContain(colors.bg);
    expect(j).toContain('"paddingTop":52'); // 24 (barra de estado) + 28
    act(() => r.unmount());
  });
});
