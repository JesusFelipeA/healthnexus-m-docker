import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getPatient, getPatients } from '../api';
import useFetch from '../hooks/useFetch';
import { Button, Card, Chip, Empty, ErrorBox, Field, Ico, Loading, Screen, Skeleton, TriageBadge, colors } from '../components/ui';
import { insigniaTriage } from '../theme/paletas';
import { iniciales } from '../utils/fecha';
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

const FILTROS = [
  { id: '', label: 'Todos' },
  { id: 'rojo', label: 'I Crítico' },
  { id: 'naranja', label: 'II Muy urgente' },
  { id: 'amarillo', label: 'III Urgente' },
  { id: 'verde', label: 'IV Leve' },
  { id: 'azul', label: 'V No urgente' },
  { id: 'sin', label: 'Sin triage' },
];

export default function Patients({ navigation, route }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [nivel, setNivel] = useState('');
  const [open, setOpen] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  // Sin filtro se llama igual que antes (getPatients(q)) para no cambiar la petición
  const { data, loading, error, reload } = useFetch(() => (nivel ? getPatients(query, nivel) : getPatients(query)), [query, nivel]);
  const list = data || [];

  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 400); return () => clearTimeout(t); }, [q]);

  // Al volver del alta: recarga la lista y abre la ficha del paciente nuevo
  const nuevoId = route.params?.nuevoId;
  useEffect(() => {
    if (nuevoId) { setQ(''); setQuery(''); setNivel(''); reload(true); setOpen(nuevoId); navigation.setParams({ nuevoId: undefined }); }
  }, [nuevoId, reload, navigation]);

  const refrescar = async () => {
    setRefrescando(true);
    try { await reload(true); } finally { setRefrescando(false); }
  };

  const filtro = FILTROS.find((f) => f.id === nivel) || FILTROS[0];

  return (
    <Screen title="Pacientes" icon="people-outline" subtitle={data ? `${list.length} paciente${list.length === 1 ? '' : 's'}${nivel ? ` · ${filtro.label}` : ''}` : undefined} onRefresh={refrescar} refreshing={refrescando}>
      <Button title="Nuevo paciente" icon="person-add-outline" onPress={() => navigation.navigate('NuevoPaciente')} style={{ marginBottom: 16 }} />
      <Field value={q} onChangeText={setQ} icon="search-outline" placeholder="Buscar por nombre, CURP o teléfono..." autoCapitalize="none" accessibilityLabel="Buscar paciente" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: -4, marginBottom: 14 }} accessibilityLabel="Filtrar por nivel de triage">
        {FILTROS.map((f) => (
          <Chip key={f.id || 'todos'} label={f.label} active={nivel === f.id} onPress={() => setNivel(f.id)} dot={f.id ? insigniaTriage(f.id).dot : undefined} />
        ))}
      </ScrollView>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? <Skeleton filas={5} /> : list.length === 0 ? (
        <>
          <Empty
            icon="people-outline"
            text={nivel ? `Sin pacientes en ${filtro.label}` : 'No hay pacientes para mostrar.'}
            hint={nivel ? 'Cuando el médico clasifique a un paciente en este nivel, aparecerá aquí.' : q ? 'Prueba con otro nombre, CURP o teléfono.' : undefined}
          />
          {nivel ? <Button title="Ver todos los pacientes" variant="outline" color={colors.text} onPress={() => setNivel('')} style={{ marginTop: 18 }} /> : null}
        </>
      ) : (
        <>
          {list.map((p) => (
            <Card key={p.id} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <Pressable
                onPress={() => setOpen(open === p.id ? null : p.id)}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, ${open === p.id ? 'ocultar ficha' : 'ver ficha'}`}
                accessibilityState={{ expanded: open === p.id }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: colors.label }}>{iniciales(p.name)}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }} numberOfLines={1}>{p.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.sub }} numberOfLines={1}>{p.age} años · {SEXO[p.sexo] || p.sexo}{p.telefono ? ` · ${p.telefono}` : ''}</Text>
                  {p.curp ? <Text style={{ fontSize: 12, color: colors.faint }} numberOfLines={1}>CURP {p.curp}</Text> : null}
                </View>
                <TriageBadge nivel={p.triageLevel} />
                <Ico name={open === p.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.sub} />
              </Pressable>
              {open === p.id ? <Ficha id={p.id} /> : null}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
