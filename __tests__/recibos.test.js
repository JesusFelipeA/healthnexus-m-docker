// HU-75: descarga y entrega del recibo PDF (servicio con las librerías nativas simuladas)
const mockFetch = jest.fn();
const mockUnlink = jest.fn(() => Promise.resolve());
const mockCopy = jest.fn(() => Promise.resolve('content://downloads/1'));
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: { dirs: { CacheDir: '/cache' }, unlink: (...a) => mockUnlink(...a) },
    config: jest.fn(() => ({ fetch: (...a) => mockFetch(...a) })),
    MediaCollection: { copyToMediaStore: (...a) => mockCopy(...a) },
  },
}));
const mockOpen = jest.fn(() => Promise.resolve({}));
jest.mock('react-native-share', () => ({ __esModule: true, default: { open: (...a) => mockOpen(...a) } }));
const mockNoAutorizado = jest.fn();
jest.mock('../src/api/client', () => ({
  ApiError: class ApiError extends Error { constructor(s, m) { super(m); this.status = s; } },
  authHeaders: () => ({ Authorization: 'Bearer abc' }),
  notificarNoAutorizado: () => mockNoAutorizado(),
  verificarTransporte: jest.fn(),
}));
jest.mock('../src/config', () => ({ API_URL: 'https://api.test/api' }));

const { descargarReciboTemporal, guardarRecibo, compartirRecibo } = require('../src/services/recibos');
const respuesta = (status, cuerpo = '', ruta = '/cache/recibo-PAG-1.pdf') => ({ info: () => ({ status }), text: async () => cuerpo, path: () => ruta });

beforeEach(() => { jest.clearAllMocks(); require('react-native').Platform.OS = 'android'; });

test('baja el PDF con el token a la caché privada de la app', async () => {
  mockFetch.mockResolvedValue(respuesta(200));
  const ruta = await descargarReciboTemporal(1, 'PAG-1');
  expect(ruta).toBe('/cache/recibo-PAG-1.pdf');
  expect(mockFetch).toHaveBeenCalledWith('GET', 'https://api.test/api/pagos/1/recibo', { Authorization: 'Bearer abc' });
});

test('el nombre del archivo no admite caracteres peligrosos del folio', async () => {
  mockFetch.mockResolvedValue(respuesta(200));
  const RNBlobUtil = require('react-native-blob-util').default;
  await descargarReciboTemporal(1, '../../etc/passwd');
  expect(RNBlobUtil.config).toHaveBeenCalledWith({ fileCache: true, path: '/cache/recibo-etcpasswd.pdf' });
});

test('un error de la API se convierte en mensaje claro y se borra el archivo parcial', async () => {
  mockFetch.mockResolvedValue(respuesta(404, JSON.stringify({ error: 'Pago no encontrado' })));
  await expect(descargarReciboTemporal(9, 'PAG-9')).rejects.toMatchObject({ status: 404, message: 'Pago no encontrado' });
  expect(mockUnlink).toHaveBeenCalled();
});

test('con la sesión vencida (401) se cierra la sesión', async () => {
  mockFetch.mockResolvedValue(respuesta(401, JSON.stringify({ error: 'Sesión vencida' })));
  await expect(descargarReciboTemporal(1, 'PAG-1')).rejects.toMatchObject({ status: 401 });
  expect(mockNoAutorizado).toHaveBeenCalled();
});

test('sin conexión responde con el mensaje de red', async () => {
  mockFetch.mockRejectedValue(new Error('network'));
  await expect(descargarReciboTemporal(1, 'PAG-1')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('No se pudo conectar') });
});

test('guardar copia el PDF a Descargas y limpia el temporal', async () => {
  mockFetch.mockResolvedValue(respuesta(200));
  const r = await guardarRecibo(1, 'PAG-1');
  expect(mockCopy).toHaveBeenCalledWith({ name: 'recibo-PAG-1.pdf', parentFolder: '', mimeType: 'application/pdf' }, 'Download', '/cache/recibo-PAG-1.pdf');
  expect(r.lugar).toMatch(/Descargas/);
  expect(mockUnlink).toHaveBeenCalledWith('/cache/recibo-PAG-1.pdf');
});

test('compartir abre el menú con el PDF adjunto y borra el temporal aunque se cancele', async () => {
  mockFetch.mockResolvedValue(respuesta(200));
  await compartirRecibo(1, 'PAG-1');
  expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:///cache/recibo-PAG-1.pdf', type: 'application/pdf', failOnCancel: false }));
  expect(mockUnlink).toHaveBeenCalledWith('/cache/recibo-PAG-1.pdf');
  mockOpen.mockRejectedValueOnce(new Error('falló'));
  await expect(compartirRecibo(1, 'PAG-1')).rejects.toThrow('falló');
  expect(mockUnlink).toHaveBeenCalledTimes(2);
});
