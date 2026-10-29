// HU-74 y HU-75: cuentas y recibos en la app
import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockNavigate = jest.fn();
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }) }));
jest.mock('react-native-keychain', () => ({}));
jest.mock('../src/api', () => ({ getCuentas: jest.fn(), getCuenta: jest.fn() }));
jest.mock('../src/services/recibos', () => ({ guardarRecibo: jest.fn(), compartirRecibo: jest.fn() }));

const api = require('../src/api');
const recibos = require('../src/services/recibos');
const { fmtMoney } = require('../src/utils/dinero');
const Cuentas = require('../src/screens/Cuentas').default;
const CuentaDetalle = require('../src/screens/CuentaDetalle').default;

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const montar = async (el) => { let r; await act(async () => { r = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={metrics}>{el}</SafeAreaProvider>); }); await flush(); return r; };
// Une todos los textos de la pantalla (React los parte en varios fragmentos: "2", " × ", "$750.00")
const hojas = (n) => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(hojas).join('') : hojas(n.children));
const texto = (r) => hojas(r.toJSON());

const cuenta = { id: 7, folio: 'CTA-1', estado: 'abierta', paciente: 'Ana Pérez', curp: null, subtotal: 1500, descuento: 100, total: 1400, pagado: 500, saldo: 900 };
const detalle = {
  ...cuenta, motivoDescuento: 'Convenio', paciente: { id: 3, nombre: 'Ana Pérez', curp: 'PELA900101MMCRPN01' },
  cargos: [{ id: 1, concepto: 'Consulta general', cantidad: 2, precioUnitario: 750, descuento: 0, importe: 1500 }],
  pagos: [
    { id: 2, folio: 'PAG-2', monto: 200, metodo: 'efectivo', cancelado: true, motivoCancelacion: 'Error de captura', pagadoEn: '2026-10-20 17:00:00' },
    { id: 1, folio: 'PAG-1', monto: 500, metodo: 'tarjeta', referencia: '**** 4242', cancelado: false, pagadoEn: '2026-10-20 16:00:00', cobradoPor: 'Caja' },
  ],
  verificacion: { pagadoCalculado: 500, saldoCalculado: 900, coincide: true },
};

beforeEach(() => { jest.clearAllMocks(); jest.useRealTimers(); });

describe('formato de dinero', () => {
  test('pone miles, centavos y signo', () => {
    expect(fmtMoney(0)).toBe('$0.00');
    expect(fmtMoney(1234.5)).toBe('$1,234.50');
    expect(fmtMoney(1234567.891)).toBe('$1,234,567.89');
    expect(fmtMoney(-80)).toBe('-$80.00');
    expect(fmtMoney('abc')).toBe('$0.00');
  });
});

describe('lista de cuentas (HU-74)', () => {
  test('muestra paciente, montos y el saldo pendiente; al tocar abre el detalle', async () => {
    api.getCuentas.mockResolvedValue({ total: 1, saldoPendiente: 900, data: [cuenta] });
    const r = await montar(<Cuentas />);
    const t = texto(r);
    expect(t).toContain('Ana Pérez');
    expect(t).toContain('$1,400.00');
    expect(t).toContain('$900.00');
    expect(t).toContain('Abierta');
    const tarjeta = r.root.findAllByProps({ accessibilityLabel: 'Cuenta CTA-1 de Ana Pérez' })[0];
    act(() => tarjeta.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith('CuentaDetalle', { id: 7 });
  });

  test('sin resultados muestra el aviso y un error de la API se muestra con su mensaje', async () => {
    api.getCuentas.mockResolvedValue({ total: 0, saldoPendiente: 0, data: [] });
    expect(texto(await montar(<Cuentas />))).toContain('No hay cuentas para mostrar.');
    api.getCuentas.mockRejectedValue(Object.assign(new Error('No tienes permiso para esta acción'), { status: 403 }));
    expect(texto(await montar(<Cuentas />))).toContain('Tu rol no tiene permiso para esta acción.');
  });

  test('el filtro "Con saldo" pide con_saldo=1 a la API', async () => {
    api.getCuentas.mockResolvedValue({ total: 0, saldoPendiente: 0, data: [] });
    const r = await montar(<Cuentas />);
    const chips = r.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityState && 'selected' in n.props.accessibilityState);
    const conSaldo = chips.find((n) => n.findAll((m) => m.type === 'Text').some((t) => t.children.join('') === 'Con saldo'));
    expect(conSaldo).toBeTruthy();
    await act(async () => { conSaldo.props.onPress(); });
    await flush();
    expect(api.getCuentas.mock.calls.some(([p]) => p.con_saldo === '1')).toBe(true);
  });
});

describe('detalle de cuenta y recibos (HU-74, HU-75)', () => {
  test('muestra cargos, pagos con el cancelado marcado y el descuento', async () => {
    api.getCuenta.mockResolvedValue(detalle);
    const t = texto(await montar(<CuentaDetalle route={{ params: { id: 7 } }} />));
    expect(api.getCuenta).toHaveBeenCalledWith(7);
    expect(t).toContain('Consulta general');
    expect(t).toContain('2 × $750.00');
    expect(t).toContain('Cancelado');
    expect(t).toContain('Motivo: Error de captura');
    expect(t).toContain('Aplicado');
    expect(t).toContain('Convenio');
    expect(t).not.toContain('no coincide');
  });

  test('avisa cuando el saldo guardado no cuadra con los pagos', async () => {
    api.getCuenta.mockResolvedValue({ ...detalle, verificacion: { pagadoCalculado: 500, saldoCalculado: 900, coincide: false } });
    expect(texto(await montar(<CuentaDetalle route={{ params: { id: 7 } }} />))).toContain('no coincide');
  });

  test('Descargar y Compartir llaman al servicio con el pago correcto', async () => {
    api.getCuenta.mockResolvedValue(detalle);
    recibos.guardarRecibo.mockResolvedValue({ nombre: 'recibo-PAG-1.pdf', lugar: 'la carpeta Descargas' });
    recibos.compartirRecibo.mockResolvedValue();
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await montar(<CuentaDetalle route={{ params: { id: 7 } }} />);
    const boton = (titulo) => r.root.findAllByProps({ accessibilityLabel: titulo }).filter((n) => n.props.onPress);
    await act(async () => { boton('Descargar')[1].props.onPress(); });     // el segundo pago listado es PAG-1
    await flush();
    expect(recibos.guardarRecibo).toHaveBeenCalledWith(1, 'PAG-1');
    expect(alerta).toHaveBeenCalledWith('Recibo guardado', expect.stringContaining('Descargas'));
    await act(async () => { boton('Compartir')[1].props.onPress(); });
    await flush();
    expect(recibos.compartirRecibo).toHaveBeenCalledWith(1, 'PAG-1');
  });

  test('si el recibo falla se avisa con un mensaje claro y los botones vuelven a estar activos', async () => {
    api.getCuenta.mockResolvedValue(detalle);
    recibos.compartirRecibo.mockRejectedValue(Object.assign(new Error('Pago no encontrado'), { status: 404 }));
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const r = await montar(<CuentaDetalle route={{ params: { id: 7 } }} />);
    await act(async () => { r.root.findAllByProps({ accessibilityLabel: 'Compartir' }).filter((n) => n.props.onPress)[0].props.onPress(); });
    await flush();
    expect(alerta).toHaveBeenCalledWith('No se pudo obtener el recibo', 'Pago no encontrado');
    expect(r.root.findAllByProps({ accessibilityLabel: 'Compartir' }).filter((n) => n.props.onPress)[0].props.accessibilityState.disabled).toBe(false);
  });
});
