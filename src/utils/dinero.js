// Formato de dinero sin depender de Intl (Hermes en Android no siempre trae todos los locales).
export const fmtMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '$0.00';
  const [ent, dec] = Math.abs(n).toFixed(2).split('.');
  return `${n < 0 ? '-' : ''}$${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
};

export const ESTADO_CUENTA = {
  abierta: { label: 'Abierta', tono: 'warning' },
  cerrada: { label: 'Cerrada', tono: 'success' },
  cancelada: { label: 'Cancelada', tono: 'danger' },
};

export const METODO_PAGO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', otro: 'Otro' };
