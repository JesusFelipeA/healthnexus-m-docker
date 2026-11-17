import { createContext, useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { disposicion } from '../utils/disposicion';

/**
 * Disposición de la pantalla actual. Screen la publica para que sus hijos (por ejemplo
 * <Rejilla>) usen el mismo ancho y número de columnas que el contenedor.
 */
export const DisposicionContext = createContext(null);

/** Calcula la disposición con el tamaño real de la ventana; se recalcula al girar o redimensionar. */
export default function useDisposicion({ amplio = false } = {}) {
  const { width, height } = useWindowDimensions();
  return useMemo(() => disposicion({ width, height }, { amplio }), [width, height, amplio]);
}

/** La disposición del Screen que contiene al componente (o una de lectura si no hay Screen). */
export function useDisposicionActual() {
  const delScreen = useContext(DisposicionContext);
  const propia = useDisposicion();
  return delScreen || propia;
}
