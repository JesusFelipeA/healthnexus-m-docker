import { http } from './client';

const qs = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  ).toString();
  return s ? `?${s}` : '';
};

// Auth
export const login = (email, password, fingerprint) =>
  http.post(
    '/auth/login',
    { email, password },
    { 'X-Device-Fingerprint': fingerprint },
  );
// Segundo paso del médico: el pinToken que devolvió /auth/login + el PIN de 4 dígitos
export const verificarPin = (pinToken, pin, fingerprint) =>
  http.post(
    '/auth/pin',
    { pinToken, pin },
    { 'X-Device-Fingerprint': fingerprint },
  );
export const me = () => http.get('/auth/me');

// Notificaciones push: token de Firebase de este teléfono (va ligado a la huella del dispositivo)
export const registrarTokenPush = (token, fingerprint) =>
  http.post('/notificaciones/token', { token }, { 'X-Device-Fingerprint': fingerprint });
export const quitarTokenPush = (fingerprint) =>
  http.del('/notificaciones/token', { 'X-Device-Fingerprint': fingerprint });

// Dashboard, pacientes y triage
export const getStats = () => http.get('/stats');
export const getPatients = (q) => http.get(`/patients${qs({ q })}`);
export const getPatient = (id) => http.get(`/patients/${id}`);
export const createPatient = (data) => http.post('/patients', data);
export const getTriagePatients = (params) => http.get(`/triage${qs(params)}`);
   export const setTriage = (id, triageLevel, datos = {}) =>
     http.patch(`/patients/${id}/triage`, { triageLevel, ...datos });
export const getEstados = () => http.get('/catalogos/estados');
export const getMunicipios = (estadoId) => http.get(`/catalogos/municipios${qs({ estadoId })}`);


// Cuentas y recibos (solo administrador)
export const getCuentas = (params) => http.get(`/cuentas${qs(params)}`);
export const getCuenta = (id) => http.get(`/cuentas/${id}`);

// Derivaciones
export const getCamas = () => http.get('/derivaciones/camas');
export const getInternas = () => http.get('/derivaciones/internas');
export const createInterna = data => http.post('/derivaciones/internas', data);
export const finalizarInterna = id =>
  http.patch(`/derivaciones/internas/${id}`, { estado: 'finalizada' });
export const getExternas = () => http.get('/derivaciones/externas');
export const createExterna = data => http.post('/derivaciones/externas', data);

// Hospitales
export const getHospitals = pos =>
  http.get(`/hospitals${qs(pos ? { lat: pos.lat, lng: pos.lng } : {})}`);
export const reservarCama = (hospitalId, pacienteId) =>
  http.post(`/hospitals/${hospitalId}/reservas`, { pacienteId });

// Seguimiento, auditoría y emergencias
export const getSeguimiento = () => http.get('/seguimiento');
export const getAuditoria = params => http.get(`/auditoria${qs(params)}`);
export const activarEmergencia = (mensaje, ubicacion) =>
  http.post('/emergencias', ubicacion ? { mensaje, ubicacion } : { mensaje });
// Emergencias abiertas (Dashboard) y marcarlas como atendidas
export const getEmergenciasActivas = () => http.get('/emergencias/activas');
export const atenderEmergencia = id => http.patch(`/emergencias/${id}/atender`);

// Farmacia
export const getFarmaciaResumen = () => http.get('/farmacia/resumen');
export const getMedicamentos = params =>
  http.get(`/farmacia/medicamentos${qs(params)}`);
export const getCatalogo = q => http.get(`/farmacia/catalogo${qs({ q })}`);
export const getExistencias = params =>
  http.get(`/farmacia/existencias${qs(params)}`);
export const getMovimientos = params =>
  http.get(`/farmacia/movimientos${qs(params)}`);
export const createMovimiento = data =>
  http.post('/farmacia/movimientos', data);
export const getAlertasFarmacia = () => http.get('/farmacia/alertas');

// Enfermería
export const getSignos = pacienteId =>
  http.get(`/enfermeria/signos${qs({ pacienteId })}`);
export const createSignos = data => http.post('/enfermeria/signos', data);
// Se piden las 200 más recientes y la pantalla las pagina de 10 en 10
export const getAdministraciones = pacienteId =>
  http.get(`/enfermeria/administraciones${qs({ pacienteId, limit: 200 })}`);
export const createAdministracion = data =>
  http.post('/enfermeria/administraciones', data);
