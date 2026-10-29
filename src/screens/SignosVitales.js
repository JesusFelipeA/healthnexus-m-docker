import React, { useState } from 'react';

import { Alert, Text, View } from 'react-native';

import { createSignos, getPatients, getSignos } from '../api';

import { useAuth } from '../context/AuthContext';

import useFetch from '../hooks/useFetch';
import usePagination from '../hooks/usePagination';

import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Ico,
  Loading,
  Paginator,
  Screen,
  SectionTitle,
  SelectField,
  colors,
} from '../components/ui';

import { fmtDateTime } from '../utils/triage';
import { esAnormal, revisarSignos } from '../utils/signosVitales';
import { mensajeApi } from '../utils/errors';

const EMPTY = {
  temperatura: '',
  fc: '',
  fr: '',
  presion: '',
  spo2: '',
  glucosa: '',
  peso: '',
  talla: '',
  dolor: '',
  notas: '',
};

const toNum = v => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

export default function SignosVitales() {
  const { can } = useAuth();
  const canWrite = can('enfermeria');

  const [pacienteId, setPacienteId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const patients = useFetch(getPatients, []);
  const list = useFetch(() => getSignos(pacienteId), [pacienteId]);

  const records = list.data || [];

  /* ===== Paginación ===== */
  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    paginated,
    setPage,
    setPageSize,
  } = usePagination(records, {
    initialPageSize: 10,
    resetDeps: [pacienteId],
  });

  const set = k => v => setF(x => ({ ...x, [k]: v }));

  const save = async () => {
    if (!pacienteId)
      return setError('Selecciona primero el paciente (arriba).');

    const body = {
      pacienteId: Number(pacienteId),
      temperatura: toNum(f.temperatura),
      frecuenciaCardiaca: toNum(f.fc),
      frecuenciaRespiratoria: toNum(f.fr),
      presionArterial: f.presion.trim() || undefined,
      saturacionOxigeno: toNum(f.spo2),
      glucosa: toNum(f.glucosa),
      peso: toNum(f.peso),
      talla: toNum(f.talla),
      escalaDolor: toNum(f.dolor),
      notas: f.notas.trim() || undefined,
    };

    const { error: invalido, avisos } = revisarSignos(body);
    if (invalido) return setError(invalido);
    setError('');

    // HU-40: fuera del rango normal se avisa y se registra solo si la enfermera confirma
    if (avisos.length > 0) {
      Alert.alert(
        'Valores fuera del rango normal',
        `${avisos.join('\n')}\n\n¿Registrar de todos modos?`,
        [
          { text: 'Revisar', style: 'cancel' },
          { text: 'Registrar', onPress: () => guardar(body) },
        ],
      );
      return;
    }
    await guardar(body);
  };

  const guardar = async body => {
    setBusy(true);
    setError('');

    try {
      await createSignos(body);
      Alert.alert('Listo', 'Signos vitales registrados.');
      setShowForm(false);
      setF(EMPTY);
      list.reload(true);
    } catch (e) {
      setError(mensajeApi(e));
    } finally {
      setBusy(false);
    }
  };

  // Los valores fuera del rango normal se resaltan en rojo
  const chip = (label, value, unit = '', clave = null) => {
    if (value === null || value === undefined || value === '') return null;
    const anormal = clave ? esAnormal(clave, value) : false;
    return (
      <View
        key={label}
        accessibilityLabel={anormal ? `${label} fuera del rango normal` : undefined}
        style={{
          backgroundColor: anormal ? colors.dangerTint : colors.bg,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
        }}
      >
        <Text style={{ fontSize: 11, color: anormal ? colors.danger : colors.sub }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '800', color: anormal ? colors.danger : colors.text }}>
          {value}
          {unit}
        </Text>
      </View>
    );
  };

  return (
    <Screen
      title="Signos vitales"
      icon="pulse-outline"
      iconColor={colors.coral}
    >
      <SelectField
        label="Paciente"
        icon="person-outline"
        value={pacienteId}
        onChange={setPacienteId}
        placeholder="Todos los pacientes"
        options={(patients.data || []).map(p => ({
          value: p.id,
          label: p.name,
        }))}
      />

      {pacienteId ? (
        <Button
          variant="soft"
          title="Ver todos los pacientes"
          onPress={() => setPacienteId('')}
          style={{ marginTop: -6, marginBottom: 16 }}
        />
      ) : null}

      {canWrite && !showForm ? (
        <Button
          title="Registrar signos vitales"
          icon="add-circle-outline"
          onPress={() => setShowForm(true)}
          style={{ marginBottom: 24 }}
        />
      ) : null}

      <ErrorBox message={error || list.error} onRetry={list.reload} />

      {showForm && (
        <Card>
          <Text style={{ fontSize: 13, color: colors.sub, marginBottom: 14 }}>
            Llena solo lo que mediste (al menos un valor).
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Temp. (°C)"
                value={f.temperatura}
                onChangeText={set('temperatura')}
                keyboardType="decimal-pad"
                placeholder="36.5"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Presión"
                value={f.presion}
                onChangeText={set('presion')}
                keyboardType="numbers-and-punctuation"
                placeholder="120/80"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="FC (lpm)"
                value={f.fc}
                onChangeText={set('fc')}
                keyboardType="number-pad"
                placeholder="80"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="FR (rpm)"
                value={f.fr}
                onChangeText={set('fr')}
                keyboardType="number-pad"
                placeholder="18"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="SpO₂ (%)"
                value={f.spo2}
                onChangeText={set('spo2')}
                keyboardType="number-pad"
                placeholder="97"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Glucosa (mg/dL)"
                value={f.glucosa}
                onChangeText={set('glucosa')}
                keyboardType="number-pad"
                placeholder="95"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Peso (kg)"
                value={f.peso}
                onChangeText={set('peso')}
                keyboardType="decimal-pad"
                placeholder="70"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Talla (m)"
                value={f.talla}
                onChangeText={set('talla')}
                keyboardType="decimal-pad"
                placeholder="1.70"
              />
            </View>
          </View>

          <Field
            label="Dolor (0 a 10)"
            value={f.dolor}
            onChangeText={set('dolor')}
            keyboardType="number-pad"
            placeholder="0"
          />

          <Field
            label="Notas"
            value={f.notas}
            onChangeText={set('notas')}
            placeholder="Observaciones"
            multiline
          />

          <Button
            title="Guardar"
            icon="save-outline"
            onPress={save}
            loading={busy}
          />

          <Button
            title="Cancelar"
            variant="outline"
            color={colors.coral}
            onPress={() => {
              setShowForm(false);
              setError('');
            }}
            style={{ marginTop: 10 }}
          />
        </Card>
      )}

      <SectionTitle>Registros recientes</SectionTitle>

      {list.loading && !list.data ? (
        <Loading />
      ) : records.length === 0 ? (
        <Empty icon="pulse-outline" text="No hay signos vitales registrados." />
      ) : (
        <>
          {paginated.map(s => (
            <Card key={s.id} style={{ padding: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.text,
                }}
              >
                {s.paciente}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                  marginBottom: 12,
                }}
              >
                <Ico name="time-outline" size={13} color={colors.faint} />
                <Text style={{ fontSize: 11, color: colors.faint }}>
                  {fmtDateTime(s.fecha)}
                  {s.registradoPor ? ` · ${s.registradoPor}` : ''}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {chip('Temp.', s.temperatura, ' °C', 'temperatura')}
                {chip('Presión', s.presion, '', 'presionArterial')}
                {chip('FC', s.fc, ' lpm', 'frecuenciaCardiaca')}
                {chip('FR', s.fr, ' rpm', 'frecuenciaRespiratoria')}
                {chip('SpO₂', s.spo2, '%', 'saturacionOxigeno')}
                {chip('Glucosa', s.glucosa, '', 'glucosa')}
                {chip('Peso', s.peso, ' kg')}
                {chip('Talla', s.talla, ' m')}
                {chip('Dolor', s.dolor, '/10')}
              </View>

              {s.notas ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.sub,
                    marginTop: 10,
                  }}
                >
                  {s.notas}
                </Text>
              ) : null}
            </Card>
          ))}

          <Paginator
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onChangePage={setPage}
            onChangePageSize={setPageSize}
            colors={colors}
          />
        </>
      )}
    </Screen>
  );
}
