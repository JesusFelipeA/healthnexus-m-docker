import { mensajeApi } from '../utils/errors';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getExistencias } from '../api';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Screen, colors } from '../components/ui';
import { fmtDate } from '../utils/triage';

const FILTERS = [['', 'Todos'], ['30', 'Caducan en 30 días'], ['vencidos', 'Vencidos']];

function caducidad(dias) {
  if (dias < 0) return { text: `Vencido hace ${-dias} d`, color: colors.danger, bg: colors.dangerTint };
  if (dias <= 30) return { text: `Caduca en ${dias} d`, color: colors.warning, bg: colors.warningTint };
  return { text: 'Vigente', color: colors.success, bg: colors.successTint };
}

export default function Existencias({ navigation }) {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [caduca, setCaduca] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [caduca]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    getExistencias({ q: query, caduca, page, limit: 30 })
      .then((r) => { if (!alive) return; setTotal(r.total); setRows((prev) => (page === 1 ? r.data : [...prev, ...r.data])); })
      .catch((e) => alive && setError(mensajeApi(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, caduca, page]);

  return (
    <Screen title="Existencias por lote" icon="cube-outline" iconColor={colors.teal}>
      <Field value={q} onChangeText={setQ} placeholder="Buscar medicamento o lote..." autoCapitalize="none" style={{}} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }}>
        {FILTERS.map(([id, label]) => (
          <Pressable key={id || 'all'} onPress={() => setCaduca(id)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: caduca === id ? colors.teal : '#fff' }}>
            <Text style={{ fontWeight: '700', fontSize: 12, color: caduca === id ? '#fff' : colors.sub }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ErrorBox message={error} />
      {loading && rows.length === 0 ? <Loading /> : rows.length === 0 ? <Empty icon="cube-outline" text="No hay lotes para mostrar." /> : rows.map((l) => {
        const c = caducidad(l.diasParaCaducar);
        return (
          <Card key={l.id} accent={c.color}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>{l.medicamento}</Text>
              <Badge text={c.text} color={c.color} bg={c.bg} />
            </View>
            <Text style={{ fontSize: 13, color: colors.sub }}>Lote {l.lote} · Caduca {fmtDate(l.caducidad)}</Text>
            <Text style={{ fontSize: 13, color: colors.sub, marginTop: 4 }}>Disponible: <Text style={{ fontWeight: '800', color: colors.text }}>{l.disponible}</Text> de {l.inicial}{l.proveedor ? ` · ${l.proveedor}` : ''}</Text>
            {can('farmacia') ? (
              <Button variant="soft" icon="swap-vertical-outline" title="Registrar movimiento" onPress={() => navigation.navigate('Movimientos', { lote: { id: l.id, medicamento: l.medicamento, lote: l.lote, disponible: l.disponible } })} />
            ) : null}
          </Card>
        );
      })}
      {rows.length < total ? <Button variant="soft" title={loading ? 'Cargando...' : `Cargar más (${rows.length} de ${total})`} disabled={loading} onPress={() => setPage(page + 1)} /> : null}
    </Screen>
  );
}
