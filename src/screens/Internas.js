import { mensajeApi } from '../utils/errors';
import React, { useState } from 'react';

import { Alert, Text, View } from 'react-native';

import {
  createInterna,
  finalizarInterna,
  getCamas,
  getInternas,
  getPatients,
} from '../api';

import { useAuth } from '../context/AuthContext';

import useFetch from '../hooks/useFetch';
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

export default function Internas() {
  const { can } = useAuth();

  const list = useFetch(getInternas, []);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pacienteId: '',
    camaId: '',
    motivo: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const options = useFetch(
    async () =>
      showForm
        ? {
            pacientes: await getPatients(),
            camas: await getCamas(),
          }
        : null,
    [showForm],
  );
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

  const save = async () => {
    if (!form.pacienteId || !form.camaId)
      return setError('Selecciona paciente y cama destino.');

    setBusy(true);
    setError('');

    try {
      await createInterna({
        pacienteId: Number(form.pacienteId),
        camaId: Number(form.camaId),
        motivo: form.motivo.trim(),
      });
      setShowForm(false);
      setForm({ pacienteId: '', camaId: '', motivo: '' });
      list.reload(true);
    } catch (e) {
      setError(mensajeApi(e));
    } finally {
      setBusy(false);
    }
  };

  const finish = id =>
    Alert.alert(
      'Finalizar traslado',
      '¿Finalizar este traslado y liberar la cama?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            setError('');
            try {
              await finalizarInterna(id);
              list.reload(true);
            } catch (e) {
              setError(mensajeApi(e));
            }
          },
        },
      ],
    );

  return (
    <Screen title="Derivaciones Internas" icon="swap-horizontal-outline">
      {can('medico') && !showForm && (
        <Button
          title="Nueva derivación"
          icon="add-circle-outline"
          onPress={() => setShowForm(true)}
          style={{ marginBottom: 24 }}
        />
      )}

      <ErrorBox message={error || list.error} onRetry={list.reload} />

      {showForm && (
        <Card>
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
                label="Cama destino"
                icon="bed-outline"
                value={form.camaId}
                onChange={v => setForm({ ...form, camaId: v })}
                options={(opts?.camas || []).map(c => ({
                  value: c.id,
                  label: `${c.codigo} · ${c.servicio}`,
                }))}
              />

              <Field
                label="Motivo"
                value={form.motivo}
                onChangeText={v => setForm({ ...form, motivo: v })}
                placeholder="Ej: Pasa a observación"
              />

              <Button
                title="Confirmar traslado"
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

      <SectionTitle>Traslados</SectionTitle>

      {list.loading && !list.data ? (
        <Loading />
      ) : records.length === 0 ? (
        <Empty
          icon="swap-horizontal-outline"
          text="No hay traslados registrados."
        />
      ) : (
        <>
          {paginated.map(d => {
            const active = d.estado === 'confirmada';
            return (
              <Card key={d.id}>
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
                    {d.paciente}
                  </Text>

                  <Badge
                    text={active ? 'Confirmado' : 'Finalizado'}
                    color={active ? colors.tealDeep : colors.sub}
                    bg={active ? colors.mint : '#EEF2F2'}
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
                    <Ico
                      name="location-outline"
                      size={16}
                      color={colors.teal}
                    />
                    <Text style={{ fontSize: 13, color: colors.sub }}>
                      {d.destino} · {d.cama}
                    </Text>
                  </View>

                  {d.responsable ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Ico
                        name="person-outline"
                        size={16}
                        color={colors.teal}
                      />
                      <Text style={{ fontSize: 13, color: colors.sub }}>
                        Responsable: {d.responsable}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={{ fontSize: 13, color: colors.sub }}>
                    Ingreso: {fmtDateTime(d.fechaIngreso)}
                    {d.motivo ? ` · ${d.motivo}` : ''}
                  </Text>
                </View>

                {active ? (
                  <Button
                    variant="soft"
                    icon="checkmark-done-outline"
                    title="Finalizar traslado"
                    onPress={() => finish(d.id)}
                  />
                ) : null}
              </Card>
            );
          })}

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
