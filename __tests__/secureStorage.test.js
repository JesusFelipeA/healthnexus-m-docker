// CP-28: el token se guarda en el Keystore y se borra al cerrar sesión
const mockKeychain = {
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly' },
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue({ password: 'tok' }),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
};
jest.mock('react-native-keychain', () => mockKeychain);

const { saveToken, getToken, clearToken } = require('../src/services/secureStorage');

describe('secureStorage', () => {
  test('guarda el token solo con el dispositivo desbloqueado y sin copia a otros equipos', async () => {
    await saveToken('abc');
    expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith('token', 'abc', expect.objectContaining({
      service: 'healthnexus.token',
      accessible: 'AccessibleWhenUnlockedThisDeviceOnly',
    }));
  });
  test('lee y borra el token', async () => {
    expect(await getToken()).toBe('tok');
    await clearToken();
    expect(mockKeychain.resetGenericPassword).toHaveBeenCalledWith({ service: 'healthnexus.token' });
  });
  test('si el Keystore falla, getToken devuelve null', async () => {
    mockKeychain.getGenericPassword.mockRejectedValueOnce(new Error('x'));
    expect(await getToken()).toBeNull();
  });
});
