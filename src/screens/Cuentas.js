import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getCuentas } from '../api';
import { Badge, Button, Card, Empty, ErrorBox, Field, Ico, Loading, Screen, colors } from '../components/ui';
import { ESTADO_CUENTA, fmtMoney } from '../utils/dinero';
import { mensajeApi } from '../utils/errors';

const TONOS = {
  warning: [colors.warning, colors.warningTint],
  success: [colors.success, colors.successTint],
  danger: [colors.danger, colors.dangerTint],
};
const FILTROS = [
  { id: 'todas', label: 'Todas', params: {} },
  { id: 'abierta', label: 'Abiertas', params: { estado: 'abierta' } },
  { id: 'saldo', label: 'Con saldo', params: { con_saldo: '1' } },
  { id: 'cerrada', label: 'Cerradas', params: { estado: 'cerrada' } },
];

export function BadgeEstado({ estado }) {
  const e = ESTADO_CUENTA[estado] || { label: estado, tono: 'warning' };
  const [color, bg] = TONOS[e.tono];
  return <Badge text={e.label} color={color} bg={bg} />;
}

export default function Cuentas() {
  const nav = useNavigation();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [saldoPendiente, setSaldoPendiente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  // Espera 400 ms después de escribir para buscar
  useEffect(() => { const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [filtro]);

  useEffect(() => {
    let alive = true;
    const f = FILTROS.find((x) => x.id === filtro) || FILTROS[0];
    setLoading(true); setError('');
    getCuentas({ ...f.params, q: query, page, limit: 20 })
      .then((r) => {
        if (!alive) return;
        setTotal(r.total); setSaldoPendiente(r.saldoPendiente);
        setRows((prev) => (page === 1 ? r.data : [...prev, ...r.data]));
      })
      .catch((e) => alive && setError(mensajeApi(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, filtro, page, intento]);

  return (
    <Screen title="Cuentas" icon="wallet-outline" iconColor={colors.teal}>
      <Card accent={colors.teal} style={{ padding: 16 }}>
        <Text style={{ fontSize: 12, color: colors.sub, fontWeight: '600' }}>Saldo pendiente (según el filtro)</Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: saldoPendiente > 0 ? colors.warning : colors.success }} accessibilityLabel={`Saldo pendiente ${fmtMoney(saldoPendiente)}`}>
          {fmtMoney(saldoPendiente)}
        </Text>
        <Text style={{ fontSize: 12, color: colors.faint }}>{total} {total === 1 ? 'cuenta' : 'cuentas'}</Text>
      </Card>

      <Field value={q} onChangeText={setQ} placeholder="Buscar por folio, paciente o CURP..." autoCapitalize="none" style={{ marginBottom: 0 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 }}>
        {FILTROS.map((f) => {
          const on = f.id === filtro;
          return (
            <Pressable key={f.id} onPress={() => setFiltro(f.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: on ? colors.teal : '#fff' }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: on ? '#fff' : colors.sub }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorBox message={error} onRetry={() => { setPage(1); setIntento((n) => n + 1); }} />
      {loading && rows.length === 0 ? <Loading /> : !error && rows.length === 0 ? <Empty icon="wallet-outline" text="No hay cuentas para mostrar." /> : rows.map((c) => (
        <Pressable key={c.id} onPress={() => nav.navigate('CuentaDetalle', { id: c.id })} accessibilityRole="button" accessibilityLabel={`Cuenta ${c.folio} de ${c.paciente}`}>
          <Card accent={c.saldo > 0 ? colors.warning : colors.success} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}>{c.paciente}</Text>
              <BadgeEstado estado={c.estado} />
            </View>
            <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>{c.folio}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <Monto etiqueta="Total" valor={c.total} />
              <Monto etiqueta="Pagado" valor={c.pagado} />
              <Monto etiqueta="Saldo" valor={c.saldo} destacar />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: colors.teal, fontWeight: '700' }}>Ver detalle</Text>
              <Ico name="chevron-forward" size={14} color={colors.teal} />
            </View>
          </Card>
        </Pressable>
      ))}
      {rows.length < total ? <Button variant="soft" title={loading ? 'Cargando...' : `Cargar más (${rows.length} de ${total})`} disabled={loading} onPress={() => setPage(page + 1)} /> : null}
    </Screen>
  );
}

export function Monto({ etiqueta, valor, destacar }) {
  const n = Number(valor) || 0;
  return (
    <View>
      <Text style={{ fontSize: 11, color: colors.faint }}>{etiqueta}</Text>
      <Text style={{ fontSize: 14, fontWeight: destacar ? '800' : '600', color: destacar ? (n > 0 ? colors.warning : colors.success) : colors.text }}>{fmtMoney(n)}</Text>
    </View>
  );
}
