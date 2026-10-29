import { mensajeApi } from '../utils/errors';
import React, { useState } from 'react';

import { Alert, Text, View } from 'react-native';

import { createExterna, getExternas, getHospitals, getPatients } from '../api';

import useFetch from '../hooks/useFetch';
import { MENSAJES_GPS, getPositionDetail } from '../services/geolocation';
import usePagination from '../hooks/usePagination';

import {
  Badge,
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

export default function Externas() {
  const list = useFetch(getExternas, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pacienteId: '',
    hospitalId: '',
    motivo: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [gpsMotivo, setGpsMotivo] = useState(null);
  const options = useFetch(async () => {
    if (!showForm) return null;
    const { pos, motivo } = await getPositionDetail();
    setGpsMotivo(motivo);
    return {
      pacientes: await getPatients(),
      // La API ordena por cercanía cuando recibe la posición
      hospitales: await getHospitals(pos),
    };
  }, [showForm]);
  const opts = options.data;

  const records = list.data || [];

  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    paginated,
    setPage,
    setPageSize,
  } = usePagination(records, { initialPageSize: 10 });

  const save = () => {
    if (!form.pacienteId || !form.hospitalId)
      return setError('Selecciona paciente y hospital destino.');

    if (form.motivo.trim().length < 3)
      return setError('Escribe el motivo del traslado.');

    const h = (opts?.hospitales || []).find(x => String(x.id) === String(form.hospitalId));
    Alert.alert(
      'Confirmar traslado',
      `¿Derivar al paciente a ${h ? h.nombre : 'el hospital seleccionado'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Derivar', onPress: doSave },
      ],
    );
  };

  const doSave = async () => {
    setBusy(true);
    setError('');

    try {
      await createExterna({
        pacienteId: Number(form.pacienteId),
        hospitalId: Number(form.hospitalId),
        motivo: form.motivo.trim(),
      });
      setShowForm(false);
      setForm({ pacienteId: '', hospitalId: '', motivo: '' });
      list.reload(true);
    } catch (e) {
      setError(mensajeApi(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Derivaciones Externas"
      icon="globe-outline"
      iconColor={colors.coral}
    >
      {!showForm && (
        <Button
          title="Nuevo traslado"
          icon="add-circle-outline"
          onPress={() => setShowForm(true)}
          style={{ marginBottom: 24 }}
        />
      )}

      <ErrorBox message={error || list.error} onRetry={list.reload} />

      {showForm && (
        <Card>
          {gpsMotivo ? (
            <ErrorBox message={MENSAJES_GPS[gpsMotivo]} onRetry={options.reload} />
          ) : null}
          <ErrorBox message={options.error} onRetry={options.reload} />

          {options.loading && !opts ? (
            <Loading />
          ) : (
            <>
              <SelectField
                label="Paciente"
                icon="person-outline"
                value={form.pacienteId}
                onChange={v => setForm({ ...form, pacienteId: v })}
                options={(opts?.pacientes || []).map(p => ({
                  value: p.id,
                  label: p.name,
                }))}
              />

              <SelectField
                label="Hospital destino"
                icon="medkit-outline"
                value={form.hospitalId}
                onChange={v => setForm({ ...form, hospitalId: v })}
                options={(opts?.hospitales || []).map(h => ({
                  value: h.id,
                  label:
                    h.distanciaKm != null
                      ? `${h.nombre} · ${h.distanciaKm} km`
                      : h.nombre,
                }))}
              />

              <Field
                label="Motivo"
                value={form.motivo}
                onChangeText={v => setForm({ ...form, motivo: v })}
                placeholder="Ej: Requiere UCI"
              />

              <Button
                title="Solicitar traslado"
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
            </>
          )}
        </Card>
      )}

      <SectionTitle>Traslados externos</SectionTitle>

      {list.loading && !list.data ? (
        <Loading />
      ) : records.length === 0 ? (
        <Empty
          icon="globe-outline"
          text="No hay traslados externos registrados."
        />
      ) : (
        <>
          {paginated.map(t => (
            <Card key={t.id} accent={colors.coral}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text,
                    flex: 1,
                  }}
                >
                  {t.paciente}
                </Text>

                <Badge
                  text="Derivado"
                  color={colors.coral}
                  bg={colors.coralTint}
                />
              </View>

              <View style={{ gap: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ico name="medkit-outline" size={16} color={colors.coral} />
                  <Text style={{ fontSize: 13, color: colors.sub }}>
                    {t.hospital}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ico name="time-outline" size={16} color={colors.coral} />
                  <Text style={{ fontSize: 13, color: colors.sub }}>
                    {fmtDateTime(t.fecha)}
                  </Text>
                </View>

                {t.motivo ? (
                  <Text style={{ fontSize: 13, color: colors.sub }}>
                    Motivo: {t.motivo}
                  </Text>
                ) : null}
              </View>
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
