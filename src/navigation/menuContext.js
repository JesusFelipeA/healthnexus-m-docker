// Contexto de la barra lateral. Va en su propio archivo (sin importar componentes)
// para que ui.js lo use sin crear una dependencia circular.
import { createContext, useContext } from 'react';

export const MenuContext = createContext(null);

/** { abrir, cerrar, abierto, rutaActual, irA } o null si no hay barra lateral (login o pruebas). */
export const useMenu = () => useContext(MenuContext);
