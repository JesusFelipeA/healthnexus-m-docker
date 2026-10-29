import { mensajeApi } from '../utils/errors';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getAuditoria } from '../api';
import { Badge, Button, Card, Empty, ErrorBox, Field, Ico, Loading, Screen, colors } from '../components/ui';
import { fmtDateTime } from '../utils/triage';

export default function Auditoria() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Espera 400 ms después de escribir para buscar
  useEffect(() => { const t = setTimeout(() => { setQuery(q); setPage(1); }, 400); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [onlyCritical, desde, hasta]);

  // Las fechas se envían solo si tienen el formato AAAA-MM-DD completo
  const okDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    getAuditoria({ q: query, desde: okDate(desde), hasta: okDate(hasta), severidad: onlyCritical ? 'critical' : '', page, limit: 30 })
      .then((r) => { if (!alive) return; setTotal(r.total); setRows((prev) => (page === 1 ? r.data : [...prev, ...r.data])); })
      .catch((e) => alive && setError(mensajeApi(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, desde, hasta, onlyCritical, page]);

  return (
    <Screen title="Auditoría" icon="clipboard-outline" iconColor={colors.amber}>
      <Field value={q} onChangeText={setQ} placeholder="Buscar usuario o acción..." autoCapitalize="none" style={{ marginBottom: 0 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Field value={desde} onChangeText={setDesde} placeholder="Desde AAAA-MM-DD" keyboardType="numbers-and-punctuation" /></View>
        <View style={{ flex: 1 }}><Field value={hasta} onChangeText={setHasta} placeholder="Hasta AAAA-MM-DD" keyboardType="numbers-and-punctuation" /></View>
      </View>
      <Pressable onPress={() => setOnlyCritical(!onlyCritical)} style={{ alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20, backgroundColor: onlyCritical ? colors.danger : '#fff' }}>
        <Text style={{ fontWeight: '700', fontSize: 12, color: onlyCritical ? '#fff' : colors.sub }}>Solo críticas</Text>
      </Pressable>

      <ErrorBox message={error} />
      {loading && rows.length === 0 ? <Loading /> : rows.length === 0 ? <Empty icon="clipboard-outline" text="No hay registros para mostrar." /> : rows.map((l) => {
        const crit = !!Number(l.critica);
        return (
          <Card key={l.id} accent={crit ? colors.danger : colors.line} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 }}>{l.usuario || 'Sistema'}</Text>
              {crit ? <Badge text="Crítica" color={colors.danger} bg={colors.dangerTint} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {crit ? <Ico name="warning-outline" size={16} color={colors.danger} /> : null}
              <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{l.accion}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Ico name="time-outline" size={13} color={colors.faint} />
              <Text style={{ fontSize: 11, color: colors.faint }}>{fmtDateTime(l.fecha)} · {l.modulo}</Text>
            </View>
          </Card>
        );
      })}
      {rows.length < total ? <Button variant="soft" title={loading ? 'Cargando...' : `Cargar más (${rows.length} de ${total})`} disabled={loading} onPress={() => setPage(page + 1)} /> : null}
    </Screen>
  );
}
