import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getPatient, getPatients } from '../api';
import useFetch from '../hooks/useFetch';
import { Button, Card, Empty, ErrorBox, Field, Ico, Loading, Screen, colors } from '../components/ui';
import { fmtDate } from '../utils/triage';

const SEXO = { hombre: 'Hombre', mujer: 'Mujer', otro: 'Otro' };

function Dato({ k, v }) {
  if (v === null || v === undefined || v === '') return null;
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 5 }}>
      <Text style={{ width: 130, fontSize: 12, color: colors.faint }}>{k}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' }}>{String(v)}</Text>
    </View>
  );
}

// Ficha completa: se pide a la API al tocar el paciente
function Ficha({ id }) {
  const { data: p, loading, error, reload } = useFetch(() => getPatient(id), [id]);
  if (loading && !p) return <Loading text="Cargando ficha..." />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const domicilio = [p.calle && `${p.calle}${p.numeroExterior ? ` ${p.numeroExterior}` : ''}${p.numeroInterior ? ` int. ${p.numeroInterior}` : ''}`, p.colonia, p.municipio, p.estado].filter(Boolean).join(', ');
  return (
    <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Dato k="Fecha de nacimiento" v={fmtDate(p.fechaNacimiento)} />
      <Dato k="Estado civil" v={p.estadoCivil} />
      <Dato k="Nacionalidad" v={p.nacionalidad} />
      <Dato k="País de nacimiento" v={p.paisNacimiento} />
      <Dato k="Estado de nacimiento" v={p.estadoNacimiento} />
      <Dato k="Pasaporte" v={p.pasaporte} />
      <Dato k="Correo" v={p.correoElectronico} />
      <Dato k="Ocupación" v={p.ocupacion} />
      <Dato k="Responsable" v={p.responsableNombre} />
      <Dato k="Tipo sanguíneo" v={p.tipoSanguineo} />
      <Dato k="Alergias" v={p.alergias} />
      <Dato k="Enf. crónicas" v={p.enfermedadesCronicas} />
      <Dato k="Domicilio" v={domicilio} />
    </View>
  );
}

export default function Patients({ navigation, route }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const { data, loading, error, reload } = useFetch(() => getPatients(query), [query]);
  const list = data || [];

  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 400); return () => clearTimeout(t); }, [q]);

  // Al volver del alta: recarga la lista y abre la ficha del paciente nuevo
  const nuevoId = route.params?.nuevoId;
  useEffect(() => {
    if (nuevoId) { setQ(''); setQuery(''); reload(true); setOpen(nuevoId); navigation.setParams({ nuevoId: undefined }); }
  }, [nuevoId, reload, navigation]);

  return (
    <Screen title="Pacientes" icon="people-outline">
      <Button title="Nuevo paciente" icon="person-add-outline" onPress={() => navigation.navigate('NuevoPaciente')} style={{ marginBottom: 20 }} />
      <Field value={q} onChangeText={setQ} placeholder="Buscar por nombre, CURP o teléfono..." autoCapitalize="none" style={{}} />
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : list.length === 0 ? <Empty icon="people-outline" text="No hay pacientes para mostrar." /> : (
        <>
          <Text style={{ fontSize: 12, color: colors.faint, marginBottom: 12 }}>{list.length} paciente{list.length === 1 ? '' : 's'}</Text>
          {list.map((p) => (
            <Card key={p.id} style={{ padding: 16 }}>
              <Pressable onPress={() => setOpen(open === p.id ? null : p.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>{p.name}</Text>
                  <Ico name={open === p.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.sub} />
                </View>
                <Text style={{ fontSize: 13, color: colors.sub, marginTop: 4 }}>{p.age} años · {SEXO[p.sexo] || p.sexo}{p.telefono ? ` · ${p.telefono}` : ''}</Text>
                {p.curp ? <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>CURP {p.curp}</Text> : null}
              </Pressable>
              {open === p.id ? <Ficha id={p.id} /> : null}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
