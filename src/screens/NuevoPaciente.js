import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { createPatient, getEstados, getMunicipios } from '../api';
import useFetch from '../hooks/useFetch';
import { mensajeApi } from '../utils/errors';
import { Button, Card, ErrorBox, Field, Screen, SectionTitle, SelectField, colors } from '../components/ui';
import { ESTADOS_CIVILES, NACIONALIDADES, PACIENTE_VACIO, SEXOS, TIPOS_SANGRE, armarPaciente, calcAge, maskDate, validarPaciente } from '../utils/paciente';

const Row = ({ children }) => <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>;
const Half = ({ children }) => <View style={{ flex: 1 }}>{children}</View>;

export default function NuevoPaciente({ navigation }) {
  const [f, setF] = useState(PACIENTE_VACIO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const estados = useFetch(getEstados, []);
  const municipios = useFetch(async () => (f.estadoId ? getMunicipios(f.estadoId) : []), [f.estadoId]);

  const edad = calcAge(f.fechaNacimiento);
  const extranjero = f.nacionalidad === 'EXTRANJERA';
  const optsEstados = (estados.data || []).map((e) => ({ value: e.id, label: e.nombre }));

  const save = async () => {
    const err = validarPaciente(f);
    if (err) return setError(err);
    setBusy(true); setError('');
    try {
      const p = await createPatient(armarPaciente(f));
      Alert.alert('Paciente registrado', `${p.nombre} ${p.apellidoPaterno} se guardó correctamente.`);
      navigation.navigate('Patients', { nuevoId: p.id });
    } catch (e) { setError(mensajeApi(e)); } finally { setBusy(false); } // mensaje controlado, nunca el texto crudo del servidor
  };

  return (
    <Screen title="Nuevo paciente" icon="person-add-outline">
      <Text style={{ fontSize: 13, color: colors.sub, marginBottom: 16 }}>Los campos con * son obligatorios.</Text>
      <ErrorBox message={error} />

      <SectionTitle>Datos personales</SectionTitle>
      <Card>
        <Field label="Nombre(s) *" icon="person-outline" value={f.nombre} onChangeText={set('nombre')} placeholder="Ej: María Fernanda" autoCapitalize="words" maxLength={255} />
        <Row>
          <Half><Field label="Apellido paterno *" value={f.apellidoPaterno} onChangeText={set('apellidoPaterno')} autoCapitalize="words" maxLength={255} /></Half>
          <Half><Field label="Apellido materno" value={f.apellidoMaterno} onChangeText={set('apellidoMaterno')} autoCapitalize="words" maxLength={255} /></Half>
        </Row>
        <Field label="Fecha de nacimiento * (AAAA-MM-DD)" icon="calendar-outline" value={f.fechaNacimiento} onChangeText={(v) => set('fechaNacimiento')(maskDate(v))} placeholder="1990-05-15" keyboardType="number-pad" maxLength={10} />
        {edad !== null ? <Text style={{ marginTop: -8, marginBottom: 14, fontSize: 12, color: edad < 18 ? colors.coral : colors.sub }}>Edad: {edad} años{edad < 18 ? ' (menor de edad: el responsable es obligatorio)' : ''}</Text> : null}
        <SelectField label="Sexo *" value={f.sexo} onChange={set('sexo')} options={SEXOS} />
        <SelectField label="Estado civil" value={f.estadoCivil} onChange={set('estadoCivil')} options={ESTADOS_CIVILES} />
        <Field label="Ocupación" value={f.ocupacion} onChangeText={set('ocupacion')} maxLength={255} style={{}} />
        <Field label={`Responsable (tutor)${edad !== null && edad < 18 ? ' *' : ''}`} value={f.responsableNombre} onChangeText={set('responsableNombre')} placeholder="Nombre del responsable" autoCapitalize="words" maxLength={255} />
      </Card>

      <SectionTitle>Nacionalidad e identificación</SectionTitle>
      <Card>
        <SelectField label="Nacionalidad" value={f.nacionalidad} onChange={(v) => setF((x) => ({ ...x, nacionalidad: v, paisNacimiento: '', pasaporte: '', estadoNacimiento: '' }))} options={NACIONALIDADES} />
        {extranjero ? (
          <>
            <Field label="País de nacimiento *" value={f.paisNacimiento} onChangeText={set('paisNacimiento')} placeholder="Ej: Chile" autoCapitalize="words" maxLength={255} />
            <Field label="Pasaporte *" value={f.pasaporte} onChangeText={(v) => set('pasaporte')(v.toUpperCase())} autoCapitalize="characters" maxLength={30} />
          </>
        ) : (
          <SelectField label="Estado de nacimiento" value={f.estadoNacimiento} onChange={set('estadoNacimiento')} options={estados.data ? (estados.data).map((e) => ({ value: e.nombre, label: e.nombre })) : []} />
        )}
        <Field label="CURP" value={f.curp} onChangeText={(v) => set('curp')(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18))} placeholder="18 caracteres" autoCapitalize="characters" autoCorrect={false} maxLength={18} />
      </Card>

      <SectionTitle>Contacto</SectionTitle>
      <Card>
        <Field label={extranjero ? 'Teléfono (7 a 15 dígitos)' : 'Teléfono (10 dígitos)'} icon="call-outline" value={f.telefonoPrincipal} onChangeText={(v) => set('telefonoPrincipal')(v.replace(/\D/g, '').slice(0, 15))} keyboardType="phone-pad" />
        <Field label="Correo electrónico" icon="mail-outline" value={f.correoElectronico} onChangeText={set('correoElectronico')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={255} />
      </Card>

      <SectionTitle>Datos médicos</SectionTitle>
      <Card>
        <SelectField label="Tipo sanguíneo" icon="water-outline" value={f.tipoSanguineo} onChange={set('tipoSanguineo')} options={TIPOS_SANGRE} />
        <Field label="Alergias" value={f.alergias} onChangeText={set('alergias')} placeholder="Ej: Penicilina (o «Ninguna conocida»)" multiline maxLength={2000} />
        <Field label="Enfermedades crónicas" value={f.enfermedadesCronicas} onChangeText={set('enfermedadesCronicas')} placeholder="Ej: Hipertensión (o «Ninguna»)" multiline maxLength={2000} />
      </Card>

      <SectionTitle>Domicilio</SectionTitle>
      <Card>
        <ErrorBox message={estados.error} onRetry={estados.reload} />
        <SelectField label="Estado" icon="map-outline" value={f.estadoId} onChange={(v) => setF((x) => ({ ...x, estadoId: v, municipioId: '' }))} options={optsEstados} />
        <SelectField label="Municipio" value={f.municipioId} onChange={set('municipioId')} placeholder={f.estadoId ? (municipios.loading ? 'Cargando...' : 'Selecciona...') : 'Primero elige el estado'}
          options={(municipios.data || []).map((m) => ({ value: m.id, label: m.nombre }))} />
        <Field label="Colonia" value={f.colonia} onChangeText={set('colonia')} maxLength={255} />
        <Field label="Calle" value={f.calle} onChangeText={set('calle')} maxLength={255} />
        <Row>
          <Half><Field label="Número exterior" value={f.numeroExterior} onChangeText={set('numeroExterior')} maxLength={30} /></Half>
          <Half><Field label="Número interior" value={f.numeroInterior} onChangeText={set('numeroInterior')} maxLength={30} /></Half>
        </Row>
      </Card>

      <Button title="Guardar paciente" icon="save-outline" onPress={save} loading={busy} />
      <Button title="Cancelar" icon="close-circle-outline" variant="outline" color={colors.coral} onPress={() => navigation.goBack()} style={{ marginTop: 12 }} />
    </Screen>
  );
}
