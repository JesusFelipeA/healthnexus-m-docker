// Catálogo de módulos de la app, agrupados por sección para la barra lateral.
// `roles` vacío = solo administrador (el administrador ve todo). La API vuelve a validar cada permiso.

export const SECCIONES = [
  { id: 'atencion', titulo: 'Atención clínica' },
  { id: 'derivaciones', titulo: 'Derivaciones' },
  { id: 'farmacia', titulo: 'Farmacia' },
  { id: 'administracion', titulo: 'Administración' },
];

export const INICIO = { id: 'Dashboard', title: 'Inicio', icon: 'home-outline', iconActivo: 'home' };

export const MODULOS = [
  { id: 'Triage', title: 'Triage', desc: 'Clasificación de pacientes', icon: 'medkit-outline', iconActivo: 'medkit', seccion: 'atencion', roles: ['medico', 'enfermeria'] },
  { id: 'Patients', title: 'Pacientes', desc: 'Lista y prioridad', icon: 'people-outline', iconActivo: 'people', seccion: 'atencion', roles: ['medico', 'enfermeria'] },
  { id: 'SignosVitales', title: 'Signos vitales', desc: 'Toma y registro', icon: 'pulse-outline', iconActivo: 'pulse', seccion: 'atencion', roles: ['enfermeria', 'medico'] },
  { id: 'Medicacion', title: 'Medicación', desc: 'Administración a pacientes', icon: 'bandage-outline', iconActivo: 'bandage', seccion: 'atencion', roles: ['enfermeria', 'medico'] },
  { id: 'Seguimiento', title: 'Seguimiento', desc: 'Estado de pacientes', icon: 'analytics-outline', iconActivo: 'analytics', seccion: 'atencion', roles: ['medico', 'enfermeria'] },

  { id: 'Internas', title: 'Derivaciones internas', desc: 'Traslados entre áreas', icon: 'swap-horizontal-outline', iconActivo: 'swap-horizontal', seccion: 'derivaciones', roles: ['medico', 'enfermeria'] },
  { id: 'Externas', title: 'Derivaciones externas', desc: 'Traslados y referencias', icon: 'globe-outline', iconActivo: 'globe', seccion: 'derivaciones', roles: ['medico'] },
  { id: 'Hospitals', title: 'Hospitales', desc: 'Cercanos y camas', icon: 'location-outline', iconActivo: 'location', seccion: 'derivaciones', roles: ['medico', 'enfermeria'] },

  { id: 'Medicamentos', title: 'Medicamentos', desc: 'Catálogo y stock', icon: 'medical-outline', iconActivo: 'medical', seccion: 'farmacia', roles: ['farmacia'] },
  { id: 'Existencias', title: 'Existencias', desc: 'Lotes y caducidad', icon: 'cube-outline', iconActivo: 'cube', seccion: 'farmacia', roles: ['farmacia', 'enfermeria', 'medico'] },
  { id: 'Movimientos', title: 'Movimientos', desc: 'Entradas, salidas y ajustes', icon: 'swap-vertical-outline', iconActivo: 'swap-vertical', seccion: 'farmacia', roles: ['farmacia', 'enfermeria'] },
  { id: 'AlertasFarmacia', title: 'Alertas', desc: 'Stock y caducidad', icon: 'warning-outline', iconActivo: 'warning', seccion: 'farmacia', roles: ['farmacia'] },

  { id: 'Cuentas', title: 'Cuentas', desc: 'Cargos, pagos y recibos', icon: 'wallet-outline', iconActivo: 'wallet', seccion: 'administracion', roles: [] },
  { id: 'Auditoria', title: 'Auditoría', desc: 'Bitácora del sistema', icon: 'clipboard-outline', iconActivo: 'clipboard', seccion: 'administracion', roles: [] },
];

// Pantallas que se abren desde la barra lateral (en ellas el encabezado muestra el botón de menú)
export const RUTAS_DE_MENU = new Set([INICIO.id, ...MODULOS.map((m) => m.id)]);

const normalizar = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Secciones con los módulos que puede ver el usuario; `busqueda` filtra por nombre o descripción. */
export function seccionesVisibles(can, busqueda = '') {
  const q = normalizar(busqueda.trim());
  const coincide = (m) => !q || normalizar(m.title).includes(q) || normalizar(m.desc).includes(q);
  return SECCIONES.map((sec) => ({
    ...sec,
    modulos: MODULOS.filter((m) => m.seccion === sec.id && can(...m.roles) && coincide(m)),
  })).filter((sec) => sec.modulos.length > 0);
}
