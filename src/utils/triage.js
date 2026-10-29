export const TRIAGE = {
  rojo: { label: 'Crítico', color: '#DC2626' },
  naranja: { label: 'Muy urgente', color: '#EA580C' },
  amarillo: { label: 'Urgente', color: '#F59E0B' },
  verde: { label: 'Leve', color: '#16A34A' },
  azul: { label: 'No urgente', color: '#2563EB' },
};
export const triageInfo = (level) => TRIAGE[level] || { label: 'Sin clasificar', color: '#8DA0A9' };

export const STATUS = { en_espera: 'En espera', atendido: 'Atendido', hospitalizado: 'Hospitalizado', derivado: 'Derivado', alta: 'Alta' };
export const statusLabel = (s) => STATUS[s] || s || '';

export const fmtDateTime = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)} ${s.slice(11, 16)}` : '');
export const fmtMinutes = (m) => {
  if (m == null) return '';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ${m % 60} min` : `${Math.floor(h / 24)} d`;
};

export const fmtDate = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '');
