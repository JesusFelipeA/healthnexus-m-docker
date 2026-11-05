import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { createAdministracion, getAdministraciones, getCatalogo, getPatients } from '../api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import usePagination from '../hooks/usePagination';
import { mensajeApi } from '../utils/errors';
import { Badge, Button, Card, Empty, ErrorBox, Field, Ico, Loading, Paginator, Screen, SectionTitle, SelectField, colors } from '../components/ui';
import { fmtDateTime } from '../utils/triage';

// T-35.2: la API descuenta del inventario lo que se administra; estos códigos explican por qué no se pudo
const MENSAJE_POR_CODIGO = {
  SIN_STOCK: (e) => `${e.message} Avisa a farmacia para que surta el medicamento.`,
  NO_HOSPITALIZADO: () => 'El paciente no tiene cama asignada. Solo se registran administraciones de pacientes hospitalizados.',
};
const FORM_VACIO = { medicamentoId: '', dosis: '', via: '', unidades: '1', observaciones: '', reaccion: false };

export default function Medicacion() {
  const { can } = useAuth();
  const canWrite = can('enfermeria');
  const [pacienteId, setPacienteId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const patients = useFetch(getPatients, []);
  const list = useFetch(() => getAdministraciones(pacienteId), [pacienteId]);
  const meds = useFetch(async () => (showForm ? getCatalogo() : null), [showForm]);
  // HU-40: paginación de 10 en 10 (se reinicia al cambiar de paciente)
  const { page, pageSize, totalItems, totalPages, paginated, setPage, setPageSize } = usePagination(list.data || [], {
    initialPageSize: 10,
    resetDeps: [pacienteId],
  });

  const save = async () => {
    if (!pacienteId) return setError('Selecciona primero el paciente (arriba).');
    if (!form.medicamentoId) return setError('Selecciona el medicamento.');
    if (!form.dosis.trim()) return setError('Escribe la dosis administrada.');
    if (form.dosis.trim().length > 50) return setError('La dosis no puede superar 50 caracteres.');
    if (form.via.trim().length > 50) return setError('La vía no puede superar 50 caracteres.');
    const unidades = Number(form.unidades);
    if (!/^\d+$/.test(form.unidades.trim()) || unidades < 1 || unidades > 20) return setError('Las unidades a descontar deben ser un número entero de 1 a 20.');
    if (form.observaciones.trim().length > 1000) return setError('Las observaciones no pueden superar 1000 caracteres.');
    setBusy(true); setError('');
    try {
      const r = await createAdministracion({
        pacienteId: Number(pacienteId), medicamentoId: Number(form.medicamentoId), dosis: form.dosis.trim(), unidades,
        via: form.via.trim() || undefined, observaciones: form.observaciones.trim() || undefined, reaccionAdversa: form.reaccion,
      });
      const stock = r && typeof r.stockNuevo === 'number' ? ` Quedan ${r.stockNuevo} u. en farmacia.` : '';
      Alert.alert('Listo', `Administración registrada. Se descontaron ${unidades} u. del inventario.${stock}`);
      setShowForm(false); setForm(FORM_VACIO); list.reload(true);
    } catch (e) {
      const porCodigo = e && Number(e.status) === 409 && MENSAJE_POR_CODIGO[e.code];
      setError(porCodigo ? porCodigo(e) : mensajeApi(e));
    } finally { setBusy(false); }
  };

  return (
    <Screen title="Medicación" icon="medkit-outline" iconColor={colors.teal}>
      <SelectField label="Paciente" icon="person-outline" value={pacienteId} onChange={setPacienteId} placeholder="Todos los pacientes" options={(patients.data || []).map((p) => ({ value: p.id, label: p.name }))} />
      {pacienteId ? <Button variant="soft" title="Ver todos los pacientes" onPress={() => setPacienteId('')} style={{ marginTop: -6, marginBottom: 16 }} /> : null}
      {canWrite && !showForm ? <Button title="Registrar administración" icon="add-circle-outline" onPress={() => setShowForm(true)} style={{ marginBottom: 24 }} /> : null}
      <ErrorBox message={error || list.error} onRetry={list.reload} />

      {showForm && (
        <Card>
          <ErrorBox message={meds.error} onRetry={meds.reload} />
          {meds.loading && !meds.data ? <Loading /> : (
            <>
              <SelectField label="Medicamento" icon="medical-outline" value={form.medicamentoId} onChange={(v) => setForm({ ...form, medicamentoId: v })} options={(meds.data || []).map((m) => ({ value: m.id, label: `${m.nombre}${m.concentracion ? ` ${m.concentracion}` : ''}${typeof m.stock === 'number' ? ` · ${m.stock > 0 ? `${m.stock} u.` : 'sin stock'}` : ''}` }))} />
              <Field label="Dosis" value={form.dosis} onChangeText={(v) => setForm({ ...form, dosis: v })} placeholder="Ej: 500 mg" />
              <Field label="Vía (opcional)" value={form.via} onChangeText={(v) => setForm({ ...form, via: v })} placeholder="Si lo dejas vacío usa la del medicamento" />
              <Field label="Unidades a descontar" value={form.unidades} onChangeText={(v) => setForm({ ...form, unidades: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" placeholder="1" />
              <Text style={{ fontSize: 12, color: colors.sub, marginTop: -8, marginBottom: 16 }}>Se descuentan del inventario de farmacia, del lote que caduca primero.</Text>
              <Field label="Observaciones" value={form.observaciones} onChangeText={(v) => setForm({ ...form, observaciones: v })} placeholder="Opcional" multiline />
              <Pressable onPress={() => setForm({ ...form, reaccion: !form.reaccion })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Ico name={form.reaccion ? 'checkbox' : 'square-outline'} size={24} color={form.reaccion ? colors.danger : colors.sub} />
                <Text style={{ color: colors.text, fontWeight: '600' }}>Hubo reacción adversa</Text>
              </Pressable>
              <Button title="Guardar" icon="save-outline" onPress={save} loading={busy} />
              <Button title="Cancelar" variant="outline" color={colors.coral} onPress={() => { setShowForm(false); setForm(FORM_VACIO); setError(''); }} style={{ marginTop: 10 }} />
            </>
          )}
        </Card>
      )}

      <SectionTitle>Administraciones recientes</SectionTitle>
      {list.loading && !list.data ? <Loading /> : (list.data || []).length === 0 ? <Empty icon="medkit-outline" text="No hay administraciones registradas." /> : (
        <>
          {paginated.map((a) => (
        <Card key={a.id} accent={a.reaccionAdversa ? colors.danger : colors.teal} style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}>{a.medicamento}</Text>
            {a.reaccionAdversa ? <Badge text="Reacción adversa" color={colors.danger} bg={colors.dangerTint} /> : null}
          </View>
          <Text style={{ fontSize: 13, color: colors.sub }}>{a.paciente}</Text>
          <Text style={{ fontSize: 13, color: colors.sub, marginTop: 2 }}>{a.dosis} · {a.via}</Text>
          {a.observaciones ? <Text style={{ fontSize: 13, color: colors.sub, marginTop: 6, backgroundColor: colors.bg, padding: 10, borderRadius: 8 }}>{a.observaciones}</Text> : null}
          <Text style={{ fontSize: 11, color: colors.faint, marginTop: 8 }}>{fmtDateTime(a.fecha)}{a.administradoPor ? ` · ${a.administradoPor}` : ''}</Text>
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
