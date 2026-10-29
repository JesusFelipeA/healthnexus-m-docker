// El dashboard ya no muestra la cuadrícula de módulos: se abren desde la barra lateral
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../src/api', () => ({
  getStats: jest.fn(() => Promise.resolve({ totalPatients: 12, redCount: 2, yellowCount: 3, greenCount: 7 })),
  getFarmaciaResumen: jest.fn(() => Promise.resolve({})),
}));

const { useAuth } = require('../src/context/AuthContext');
const { MenuContext } = require('../src/navigation/menuContext');
const Dashboard = require('../src/screens/Dashboard').default;

const metrics = { frame: { x: 0, y: 0, width: 400, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

test('muestra el resumen y el botón de menú, sin la lista de módulos', async () => {
  useAuth.mockReturnValue({ user: { nombre: 'Ana', rol: 'medico' }, can: () => true });
  const abrir = jest.fn();
  let r;
  await act(async () => {
    r = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <MenuContext.Provider value={{ abrir }}>
          <Dashboard />
        </MenuContext.Provider>
      </SafeAreaProvider>,
    );
  });
  const t = JSON.stringify(r.toJSON());
  expect(t).toContain('Resumen del día');
  expect(t).not.toContain('Accesos disponibles para ti');
  const boton = r.root.findAll((n) => n.props.accessibilityLabel === 'Abrir menú' && typeof n.props.onPress === 'function')[0];
  act(() => boton.props.onPress());
  expect(abrir).toHaveBeenCalled();
  act(() => r.unmount());
});
