// Barra lateral: módulos por rol, navegación, búsqueda y cierre de sesión
import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));

const { useAuth } = require('../src/context/AuthContext');
const { MenuProvider } = require('../src/navigation/MenuLateral');
const { BotonMenu } = require('../src/components/ui');
const { seccionesVisibles, MODULOS } = require('../src/navigation/modulos');

const canPara = (rol) => (...roles) => rol === 'administrador' || roles.includes(rol);
const idsVisibles = (rol, q) => seccionesVisibles(canPara(rol), q).flatMap((s) => s.modulos.map((m) => m.id));

describe('módulos por rol', () => {
  test('el médico ve atención, derivaciones y existencias, pero no cuentas ni farmacia', () => {
    const ids = idsVisibles('medico');
    expect(ids).toEqual(expect.arrayContaining(['Triage', 'Patients', 'Externas', 'Existencias']));
    expect(ids).not.toContain('Cuentas');
    expect(ids).not.toContain('Medicamentos');
  });
  test('enfermería no ve derivaciones externas', () => {
    expect(idsVisibles('enfermeria')).not.toContain('Externas');
    expect(idsVisibles('enfermeria')).toContain('Movimientos');
  });
  test('farmacia solo ve su sección', () => {
    expect(seccionesVisibles(canPara('farmacia')).map((s) => s.id)).toEqual(['farmacia']);
  });
  test('el administrador ve todos los módulos', () => {
    expect(idsVisibles('administrador').sort()).toEqual(MODULOS.map((m) => m.id).sort());
  });
  test('la búsqueda ignora mayúsculas y acentos', () => {
    expect(idsVisibles('administrador', 'MEDICACION')).toEqual(['Medicacion']);
    expect(idsVisibles('administrador', 'caducidad')).toEqual(['Existencias', 'AlertasFarmacia']);
  });
});

describe('MenuProvider', () => {
  const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
  let nav, logout;
  const montar = (rol = 'medico', ruta = 'Dashboard') => {
    logout = jest.fn();
    useAuth.mockReturnValue({ user: { nombre: 'Ana López', rol }, can: canPara(rol), logout });
    nav = { current: { isReady: () => true, reset: jest.fn() } };
    let r;
    act(() => {
      r = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <MenuProvider navigationRef={nav} rutaActual={ruta}>
            <BotonMenu />
            <Text>contenido</Text>
          </MenuProvider>
        </SafeAreaProvider>,
      );
    });
    return r;
  };
  const porLabel = (r, label) => r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  const texto = (r) => JSON.stringify(r.toJSON());
  const abrir = (r) => act(() => { porLabel(r, 'Abrir menú').props.onPress(); jest.runAllTimers(); });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  test('cerrado no muestra los módulos; al abrir aparecen las secciones del rol', () => {
    const r = montar('medico');
    expect(texto(r)).not.toContain('Atención clínica');
    abrir(r);
    const t = texto(r);
    ['Inicio', 'Atención clínica', 'Derivaciones', 'Triage', 'Derivaciones externas', 'Ana López', 'Médico'].forEach((x) => expect(t).toContain(x));
    expect(t).not.toContain('Administración');
    act(() => r.unmount());
  });

  test('el módulo actual aparece seleccionado', () => {
    const r = montar('medico', 'Triage');
    abrir(r);
    expect(porLabel(r, 'Triage').props.accessibilityState).toEqual({ selected: true });
    expect(porLabel(r, 'Pacientes').props.accessibilityState).toEqual({ selected: false });
    act(() => r.unmount());
  });

  test('elegir un módulo deja la pila [Inicio, módulo] y cierra el menú', () => {
    const r = montar('medico');
    abrir(r);
    act(() => { porLabel(r, 'Pacientes').props.onPress(); jest.runAllTimers(); });
    expect(nav.current.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: 'Dashboard' }, { name: 'Patients' }] });
    expect(texto(r)).not.toContain('Atención clínica');
    act(() => r.unmount());
  });

  test('"Inicio" regresa al dashboard', () => {
    const r = montar('medico', 'Triage');
    abrir(r);
    act(() => { porLabel(r, 'Inicio').props.onPress(); jest.runAllTimers(); });
    expect(nav.current.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Dashboard' }] });
    act(() => r.unmount());
  });

  test('la búsqueda filtra los módulos', () => {
    const r = montar('administrador');
    abrir(r);
    act(() => porLabel(r, 'Buscar módulo').props.onPress());
    const input = r.root.findAll((n) => n.props.placeholder === 'Buscar módulo' && typeof n.props.onChangeText === 'function')[0];
    act(() => input.props.onChangeText('audit'));
    const t = texto(r);
    expect(t).toContain('Auditoría');
    expect(t).not.toContain('Triage');
    act(() => input.props.onChangeText('zzz'));
    expect(texto(r)).toContain('No hay módulos que coincidan');
    act(() => r.unmount());
  });

  test('"Salir" pide confirmación antes de cerrar la sesión', () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = montar('farmacia');
    abrir(r);
    act(() => porLabel(r, 'Cerrar sesión').props.onPress());
    expect(logout).not.toHaveBeenCalled();
    act(() => { spy.mock.calls[0][2].find((b) => b.text === 'Cerrar sesión').onPress(); jest.runAllTimers(); });
    expect(logout).toHaveBeenCalled();
    spy.mockRestore();
    act(() => r.unmount());
  });

  test('sin sesión no hay botón de menú', () => {
    useAuth.mockReturnValue({ user: null, can: () => false, logout: jest.fn() });
    let r;
    act(() => {
      r = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={metrics}>
          <MenuProvider navigationRef={{ current: null }} rutaActual="Login"><BotonMenu /></MenuProvider>
        </SafeAreaProvider>,
      );
    });
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Abrir menú')).toHaveLength(0);
    act(() => r.unmount());
  });
});
