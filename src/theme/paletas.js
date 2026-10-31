// Paletas de color de la app (tema claro y oscuro), tomadas de la maqueta de diseño.
// Los nombres antiguos (teal, tealDeep, mint, coral, amber...) se conservan para que todas
// las pantallas existentes tomen los colores nuevos sin cambiar su código.
//
// `colors` es UN SOLO objeto que se actualiza en su lugar al cambiar de tema (aplicarTema).
// Por eso las pantallas que hacen `colors.text` en su render siempre ven el tema actual;
// el árbol de pantallas se vuelve a montar al cambiar de tema (ver App.js).

export const PALETAS = {
  claro: {
    modo: 'claro',
    // Superficies
    bg: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F4', // controles segmentados, filas alternas, esqueletos
    line: '#E4E7EF',
    inputBorder: '#D5DAE6',
    overlay: 'rgba(17, 26, 58, 0.45)',
    // Texto
    text: '#111A3A',
    label: '#2A3352',
    sub: '#4B5672',
    faint: '#5E6782',
    placeholder: '#7A8299',
    // Marca
    teal: '#4E2CCF', // primario: botones, íconos activos
    tealDeep: '#3B1FA8', // texto sobre fondos tenues, enlaces activos
    onPrimary: '#FFFFFF',
    mint: '#EFEBFF', // tinte primario
    focusRing: '#E9E4FF',
    coral: '#1F3F95',
    coralTint: '#E8EEFF',
    amber: '#6B4DE6',
    amberTint: '#F4F1FF',
    // Estados
    green: '#2E9D52',
    red: '#C62828',
    danger: '#DC2626',
    dangerText: '#A61B1B',
    dangerTint: '#FDECEC',
    dangerBorder: '#F3C4C4',
    onDanger: '#FFFFFF',
    warning: '#B45309',
    warningTint: '#FEF3E2',
    success: '#15803D',
    successTint: '#E7F7EC',
    online: '#1E6B37',
    // Emergencia (botón flotante y aviso de emergencias activas)
    emergency: '#C62828',
    emergencyBorder: '#FFFFFF',
    emergencyTint: '#FFF5F5',
    emergencyText: '#A61B1B',
    emergencyLine: '#F3C4C4',
    // Sombra
    shadow: '#111A3A',
    statusBar: 'dark-content',
  },
  oscuro: {
    modo: 'oscuro',
    bg: '#0D1222',
    surface: '#161C30',
    surfaceAlt: '#1D2440',
    line: '#263050',
    inputBorder: '#34406A',
    overlay: 'rgba(0, 0, 0, 0.6)',
    text: '#EEF1FA',
    label: '#DCE1EF',
    sub: '#B3BBD2',
    faint: '#98A1BC',
    placeholder: '#7F89A6',
    teal: '#B6A8FF',
    tealDeep: '#D4CCFF',
    onPrimary: '#160F3A',
    mint: '#26214A',
    focusRing: '#2E2760',
    coral: '#AFC2FF',
    coralTint: '#1C2546',
    amber: '#C4B5FF',
    amberTint: '#221E42',
    green: '#4ADE80',
    red: '#FF6B6B',
    danger: '#FF8A8A',
    dangerText: '#FF9C9C',
    dangerTint: '#2A1418',
    dangerBorder: '#5A2328',
    onDanger: '#2A0A0D',
    warning: '#F5B65B',
    warningTint: '#2B2112',
    success: '#6ED69A',
    successTint: '#132A1E',
    online: '#8FE0AE',
    emergency: '#D93036',
    emergencyBorder: '#0D1222',
    emergencyTint: '#2A1418',
    emergencyText: '#FF9C9C',
    emergencyLine: '#5A2328',
    shadow: '#000000',
    statusBar: 'light-content',
  },
};

// Insignias de triage (escala de Manchester): fondo, texto y punto, por tema.
// El color "sólido" de cada nivel sigue en utils/triage.js (lo usan la web y las gráficas).
export const TRIAGE_INSIGNIA = {
  claro: {
    rojo: { bg: '#FDE8E8', text: '#A61B1B', dot: '#D32F2F' },
    naranja: { bg: '#FFEBDD', text: '#8F3700', dot: '#EF6C00' },
    amarillo: { bg: '#FFF4CC', text: '#6E4E00', dot: '#E0A800' },
    verde: { bg: '#E3F4E8', text: '#1E6B37', dot: '#2E9D52' },
    azul: { bg: '#E3EEFC', text: '#1A4F9C', dot: '#2F7BE0' },
    sin: { bg: '#EEF0F4', text: '#4B5672', dot: '#9AA3B5' },
  },
  oscuro: {
    rojo: { bg: '#3A1518', text: '#FF9C9C', dot: '#FF5A5F' },
    naranja: { bg: '#3A2212', text: '#FFB27A', dot: '#FF8A3D' },
    amarillo: { bg: '#352C0E', text: '#F5D36B', dot: '#E0B400' },
    verde: { bg: '#12301D', text: '#7FD9A0', dot: '#3CC072' },
    azul: { bg: '#12233F', text: '#8DB8F5', dot: '#4C93F0' },
    sin: { bg: '#1F2638', text: '#B3BBD2', dot: '#7F89A6' },
  },
};

export const colors = { ...PALETAS.claro };

export function aplicarTema(modo) {
  const p = PALETAS[modo] || PALETAS.claro;
  if (colors.modo !== p.modo) Object.assign(colors, p);
  return colors;
}

export const insigniaTriage = (nivel) => {
  const t = TRIAGE_INSIGNIA[colors.modo] || TRIAGE_INSIGNIA.claro;
  return t[nivel] || t.sin;
};

// Estilos que dependen del tema: se calculan una vez por tema y se reutilizan.
//   const estilos = conTema(() => StyleSheet.create({ fondo: { backgroundColor: colors.bg } }));
//   function Pantalla() { const s = estilos(); ... }
export function conTema(fabrica) {
  const cache = {};
  return () => {
    const modo = colors.modo;
    if (!cache[modo]) cache[modo] = fabrica(colors);
    return cache[modo];
  };
}

// Contraste WCAG (lo usan las pruebas para vigilar la legibilidad de las paletas)
const canal = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminancia = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
