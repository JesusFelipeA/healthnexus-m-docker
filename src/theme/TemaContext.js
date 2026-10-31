// Tema claro / oscuro. La preferencia ("auto", "claro" u "oscuro") se elige en la barra lateral
// (Apariencia) y se guarda en el teléfono. "Auto" sigue el tema del sistema de Android.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { aplicarTema, colors } from './paletas';
import { guardarTema, leerTema } from '../services/preferencias';

const TemaContext = createContext(null);

export const modoEfectivo = (preferencia, sistema) =>
  preferencia === 'claro' || preferencia === 'oscuro' ? preferencia : sistema === 'dark' ? 'oscuro' : 'claro';

export function TemaProvider({ children, inicial }) {
  const sistema = useColorScheme();
  const [preferencia, setPreferencia] = useState(inicial || 'auto');

  useEffect(() => {
    if (inicial) return undefined;
    let vivo = true;
    leerTema().then((t) => { if (vivo && t) setPreferencia(t); });
    return () => { vivo = false; };
  }, [inicial]);

  const modo = modoEfectivo(preferencia, sistema);
  // Se aplica antes de dibujar a los hijos: así todo el árbol lee la paleta correcta.
  aplicarTema(modo);

  // Los diálogos nativos de Android (Alert) siguen el tema elegido; "auto" quita la preferencia.
  useEffect(() => {
    try {
      if (typeof Appearance.setColorScheme === 'function') {
        Appearance.setColorScheme(preferencia === 'claro' ? 'light' : preferencia === 'oscuro' ? 'dark' : 'unspecified');
      }
    } catch {
      /* versión de Android o de React Native sin soporte: solo cambia la interfaz de la app */
    }
  }, [preferencia]);

  const cambiarPreferencia = useCallback((p) => {
    setPreferencia(p);
    guardarTema(p);
  }, []);

  const valor = useMemo(() => ({ preferencia, modo, oscuro: modo === 'oscuro', cambiarPreferencia, colors }),
    [preferencia, modo, cambiarPreferencia]);
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

// Sin TemaProvider (por ejemplo, en pruebas de un componente suelto) se usa el tema claro.
const SIN_PROVEEDOR = { preferencia: 'claro', modo: 'claro', oscuro: false, cambiarPreferencia: () => {}, colors };
export const useTema = () => useContext(TemaContext) || { ...SIN_PROVEEDOR, modo: colors.modo, oscuro: colors.modo === 'oscuro' };
