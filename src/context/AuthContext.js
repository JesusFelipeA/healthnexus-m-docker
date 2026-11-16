import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as api from '../api';
import { setAuthToken, setUnauthorizedHandler } from '../api/client';
import {
  clearToken,
  getDeviceFingerprint,
  getToken,
  saveToken,
} from '../services/secureStorage';
import { detenerPush } from '../services/push';
import { cerrarSesionOffline, esSinConexion, guardarUsuario, usuarioGuardado } from '../services/offline';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    // Primero se borra el token de notificaciones (necesita la sesión para avisar a la API)
    await detenerPush();
    setAuthToken(null);
    setUser(null);
    await clearToken();
    await cerrarSesionOffline();
  }, []);

  // Al abrir la app: recupera la sesión guardada
  useEffect(() => {
    setUnauthorizedHandler(logout);
    (async () => {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
        try {
          const yo = await api.me();
          setUser(yo);
          guardarUsuario(yo);
        } catch (e) {
          // Sin conexión (o con el servidor caído) la sesión sigue abierta con los datos guardados en el teléfono,
          // para poder capturar signos vitales. Si el token ya no vale (401), se cierra como siempre.
          const sinServidor = esSinConexion(e) || Number(e && e.status) >= 500;
          const guardado = sinServidor ? await usuarioGuardado() : null;
          if (guardado) setUser({ ...guardado, sinConexion: true });
          else await logout();
        }
      }
      setLoading(false);
    })();
  }, [logout]);

  const iniciarSesion = useCallback(async res => {
    setAuthToken(res.token);
    await saveToken(res.token);
    setUser(res.user);
    await guardarUsuario(res.user);
  }, []);

  // Devuelve { requierePin: true, pinToken } cuando la cuenta es de médico:
  // la sesión no se abre hasta que verificarPin() valide el PIN.
  const login = useCallback(async (email, password) => {
    const fingerprint = await getDeviceFingerprint();
    const res = await api.login(email, password, fingerprint);
    if (res && res.requierePin) {
      return { requierePin: true, pinToken: res.pinToken };
    }
    await iniciarSesion(res);
    return { requierePin: false };
  }, [iniciarSesion]);

  const verificarPin = useCallback(async (pinToken, pin) => {
    const fingerprint = await getDeviceFingerprint();
    await iniciarSesion(await api.verificarPin(pinToken, pin, fingerprint));
  }, [iniciarSesion]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      verificarPin,
      logout,
      // El administrador puede todo; sin argumentos = solo administrador
      can: (...roles) =>
        !!user && (user.rol === 'administrador' || roles.includes(user.rol)),
    }),
    [user, loading, login, verificarPin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
