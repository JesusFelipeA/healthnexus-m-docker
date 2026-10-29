// Catálogos y validaciones del alta de paciente (reflejan las reglas de la API y de la tabla pacientes)

export const SEXOS = [{ value: 'hombre', label: 'Hombre' }, { value: 'mujer', label: 'Mujer' }, { value: 'otro', label: 'Otro' }];
export const ESTADOS_CIVILES = ['Soltero', 'Casado', 'Divorciado', 'Unión Libre', 'Viudo'].map((v) => ({ value: v, label: v }));
export const NACIONALIDADES = [{ value: 'MEXICANA', label: 'Mexicana' }, { value: 'EXTRANJERA', label: 'Extranjera' }];
export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }));

export const CURP_RE = /^[A-Z]{4}\d{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Va poniendo los guiones mientras se escribe: 19900515 -> 1990-05-15
export function maskDate(text) {
  const d = String(text).replace(/\D/g, '').slice(0, 8);
  let out = d.slice(0, 4);
  if (d.length > 4) out += `-${d.slice(4, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  return out;
}

export function isValidIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function calcAge(iso, today = new Date()) {
  if (!isValidIsoDate(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

// Devuelve el primer error del formulario, o null si todo está bien
export function validarPaciente(f, today = new Date()) {
  if (!f.nombre.trim()) return 'Escribe el nombre del paciente.';
  if (!f.apellidoPaterno.trim()) return 'Escribe el apellido paterno.';
  if (!isValidIsoDate(f.fechaNacimiento)) return 'La fecha de nacimiento debe tener el formato AAAA-MM-DD y ser real.';
  const edad = calcAge(f.fechaNacimiento, today);
  if (edad < 0 || f.fechaNacimiento < '1900-01-01') return 'La fecha de nacimiento debe estar entre 1900 y hoy.';
  if (!f.sexo) return 'Selecciona el sexo.';
  if (f.nacionalidad === 'EXTRANJERA') {
    if (!f.paisNacimiento.trim()) return 'Escribe el país de nacimiento.';
    if (!f.pasaporte.trim()) return 'Escribe el número de pasaporte.';
  }
  if (f.curp && !CURP_RE.test(f.curp)) return 'La CURP no es válida (18 caracteres con el formato oficial).';
  if (f.telefonoPrincipal) {
    const n = f.telefonoPrincipal.length;
    if (f.nacionalidad === 'MEXICANA' ? n !== 10 : n < 7 || n > 15) return f.nacionalidad === 'MEXICANA' ? 'El teléfono debe tener 10 dígitos.' : 'El teléfono debe tener entre 7 y 15 dígitos.';
  }
  if (f.correoElectronico && !EMAIL_RE.test(f.correoElectronico.trim())) return 'El correo electrónico no es válido.';
  if (edad < 18 && !f.responsableNombre.trim()) return 'Es menor de edad: escribe el nombre del responsable.';
  if (f.municipioId && !f.estadoId) return 'Selecciona primero el estado del domicilio.';
  return null;
}

// Arma el cuerpo para la API: solo los campos con valor
export function armarPaciente(f) {
  const body = {};
  const poner = (k, v) => { const t = typeof v === 'string' ? v.trim() : v; if (t !== '' && t !== null && t !== undefined) body[k] = t; };
  ['nombre', 'apellidoPaterno', 'apellidoMaterno', 'fechaNacimiento', 'sexo', 'estadoCivil', 'nacionalidad', 'curp', 'telefonoPrincipal',
    'correoElectronico', 'ocupacion', 'responsableNombre', 'tipoSanguineo', 'alergias', 'enfermedadesCronicas', 'colonia', 'calle', 'numeroExterior', 'numeroInterior']
    .forEach((k) => poner(k, f[k]));
  if (f.nacionalidad === 'EXTRANJERA') { poner('paisNacimiento', f.paisNacimiento); poner('pasaporte', f.pasaporte); } else poner('estadoNacimiento', f.estadoNacimiento);
  if (f.estadoId) body.estadoId = Number(f.estadoId);
  if (f.municipioId) body.municipioId = Number(f.municipioId);
  return body;
}

export const PACIENTE_VACIO = {
  nombre: '', apellidoPaterno: '', apellidoMaterno: '', fechaNacimiento: '', sexo: '', estadoCivil: '', nacionalidad: 'MEXICANA',
  paisNacimiento: '', estadoNacimiento: '', curp: '', pasaporte: '', telefonoPrincipal: '', correoElectronico: '', ocupacion: '',
  responsableNombre: '', tipoSanguineo: '', alergias: '', enfermedadesCronicas: '', estadoId: '', municipioId: '',
  colonia: '', calle: '', numeroExterior: '', numeroInterior: '',
};
