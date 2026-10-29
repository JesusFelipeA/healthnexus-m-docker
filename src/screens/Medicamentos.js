import { mensajeApi } from '../utils/errors';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { getMedicamentos } from '../api';
import { Badge, Button, Card, Empty, ErrorBox, Field, Loading, Screen, colors } from '../components/ui';

const FILTERS = [['', 'Todos'], ['bajo', 'Stock bajo'], ['sin_stock', 'Sin stock']];
const ESTADO = {
  ok: { label: 'Stock normal', color: colors.success, bg: colors.successTint },
  bajo: { label: 'Stock bajo', color: colors.warning, bg: colors.warningTint },
  sin_stock: { label: 'Sin stock', color: colors.danger, bg: colors.dangerTint },
};

export default function Medicamentos() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [estado]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    getMedicamentos({ q: query, estado, page, limit: 30 })
      .then((r) => { if (!alive) return; setTotal(r.total); setRows((prev) => (page === 1 ? r.data : [...prev, ...r.data])); })
      .catch((e) => alive && setError(mensajeApi(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, estado, page]);

  return (
    <Screen title="Medicamentos" icon="medical-outline" iconColor={colors.teal}>
      <Field value={q} onChangeText={setQ} placeholder="Buscar por nombre, sustancia o código..." autoCapitalize="none" style={{}} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, flexGrow: 0 }}>
        {FILTERS.map(([id, label]) => (
          <Pressable key={id || 'all'} onPress={() => setEstado(id)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: estado === id ? colors.teal : '#fff' }}>
            <Text style={{ fontWeight: '700', fontSize: 12, color: estado === id ? '#fff' : colors.sub }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ErrorBox message={error} />
      {loading && rows.length === 0 ? <Loading /> : rows.length === 0 ? <Empty icon="medical-outline" text="No se encontraron medicamentos." /> : rows.map((m) => {
        const e = ESTADO[m.estado] || ESTADO.ok;
        const pct = Math.max(0, Math.min(100, m.stockMaximo ? (m.stock / m.stockMaximo) * 100 : 100));
        return (
          <Card key={m.id} accent={e.color}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 }}>{m.nombre}</Text>
              <Badge text={e.label} color={e.color} bg={e.bg} />
            </View>
            <Text style={{ fontSize: 13, color: colors.sub }}>{[m.sustancia, m.presentacion, m.concentracion].filter(Boolean).join(' · ')}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {m.controlado ? <Badge text="Controlado" color={colors.danger} bg={colors.dangerTint} /> : null}
              {m.antibiotico ? <Badge text="Antibiótico" color={colors.tealDeep} bg={colors.mint} /> : null}
              {m.psicotropico ? <Badge text="Psicotrópico" color={colors.warning} bg={colors.warningTint} /> : null}
            </View>
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: colors.sub }}>Stock: <Text style={{ fontWeight: '800', color: colors.text }}>{m.stock}</Text> {m.unidad || ''}</Text>
                <Text style={{ fontSize: 12, color: colors.faint }}>Mín. {m.stockMinimo} · Máx. {m.stockMaximo}</Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 8, backgroundColor: e.color }} />
              </View>
            </View>
          </Card>
        );
      })}
      {rows.length < total ? <Button variant="soft" title={loading ? 'Cargando...' : `Cargar más (${rows.length} de ${total})`} disabled={loading} onPress={() => setPage(page + 1)} /> : null}
    </Screen>
  );
}
