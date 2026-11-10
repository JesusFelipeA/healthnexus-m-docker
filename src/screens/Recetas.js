// Dispensación de recetas: lista de consultas finalizadas con receta (igual que "Dispensaciones" en la web).
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getRecetas, getRecetasResumen } from '../api';
import { Badge, Button, Card, Chip, Empty, ErrorBox, Field, Ico, Loading, Screen, colors } from '../components/ui';
import { mensajeApi } from '../utils/errors';
import { fmtDateTime } from '../utils/triage';

const FILTROS = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'dispensadas', label: 'Dispensadas' },
  { id: 'todas', label: 'Todas' },
];

export function BadgeDispensada({ dispensada }) {
  return dispensada
    ? <Badge text="Dispensada" color={colors.success} bg={colors.successTint} />
    : <Badge text="Pendiente" color={colors.warning} bg={colors.warningTint} />;
}

export function resumenReceta(r) {
  const partes = [];
  if (r.medicamentos > 0) partes.push(`${r.medicamentos} ${r.medicamentos === 1 ? 'medicamento' : 'medicamentos'}`);
  if (r.recetaLibre) partes.push('receta libre');
  return partes.join(' + ');
}

export default function Recetas() {
  const nav = useNavigation();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState('pendientes');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const primeraVez = useRef(true);

  // Al volver del detalle (después de dispensar) se recarga la lista y los contadores
  useEffect(() => {
    if (!nav || typeof nav.addListener !== 'function') return undefined;
    return nav.addListener('focus', () => {
      if (primeraVez.current) { primeraVez.current = false; return; }
      setPage(1); setIntento((n) => n + 1);
    });
  }, [nav]);

  // Espera 400 ms después de escribir para buscar
  useEffect(() => { const t = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    let alive = true;
    getRecetasResumen().then((r) => alive && setResumen(r)).catch(() => {});
    return () => { alive = false; };
  }, [intento]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    getRecetas({ estado: filtro, q: query, page, limit: 20 })
      .then((r) => {
        if (!alive) return;
        setTotal(r.total);
        setRows((prev) => (page === 1 ? r.data : [...prev, ...r.data]));
      })
      .catch((e) => alive && setError(mensajeApi(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, filtro, page, intento]);

  const cambiarFiltro = (id) => { setFiltro(id); setPage(1); setRows([]); };

  return (
    <Screen title="Recetas" icon="document-text-outline" iconColor={colors.teal}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Contador etiqueta="Pendientes" valor={resumen ? resumen.pendientes : '—'} color={colors.warning} />
        <Contador etiqueta="Hoy" valor={resumen ? resumen.dispensadasHoy : '—'} color={colors.success} />
        <Contador etiqueta="Este mes" valor={resumen ? resumen.dispensadasMes : '—'} color={colors.teal} />
      </View>

      <Field value={q} onChangeText={setQ} placeholder="Buscar paciente o CURP..." autoCapitalize="none" style={{ marginBottom: 0 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 }}>
        {FILTROS.map((f) => <Chip key={f.id} label={f.label} active={f.id === filtro} onPress={() => cambiarFiltro(f.id)} />)}
      </View>

      <ErrorBox message={error} onRetry={() => { setPage(1); setIntento((n) => n + 1); }} />
      {loading && rows.length === 0 ? <Loading /> : !error && rows.length === 0 ? (
        <Empty icon="document-text-outline" text={filtro === 'pendientes' ? 'No hay recetas por dispensar.' : 'No hay recetas para mostrar.'} />
      ) : rows.map((r) => (
        <Pressable key={r.id} onPress={() => nav.navigate('RecetaDetalle', { id: r.id })} accessibilityRole="button" accessibilityLabel={`Receta ${r.id} de ${r.paciente}`}>
          <Card accent={r.dispensada ? colors.success : colors.warning} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}>{r.paciente}</Text>
              <BadgeDispensada dispensada={r.dispensada} />
            </View>
            <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>
              Receta #{r.id} · {fmtDateTime(r.fecha)}{r.medico ? ` · ${r.medico}` : ''}
            </Text>
            <Text style={{ fontSize: 13, color: colors.sub, marginTop: 8 }}>{resumenReceta(r)}</Text>
            {r.dispensada ? (
              <Text style={{ fontSize: 12, color: colors.faint, marginTop: 4 }}>Dispensada {fmtDateTime(r.dispensadaEn)}{r.dispensadaPor ? ` por ${r.dispensadaPor}` : ''}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <Text style={{ fontSize: 12, color: colors.teal, fontWeight: '700' }}>{r.dispensada ? 'Ver detalle' : 'Dispensar'}</Text>
              <Ico name="chevron-forward" size={14} color={colors.teal} />
            </View>
          </Card>
        </Pressable>
      ))}
      {rows.length < total ? <Button variant="soft" title={loading ? 'Cargando...' : `Cargar más (${rows.length} de ${total})`} disabled={loading} onPress={() => setPage(page + 1)} /> : null}
    </Screen>
  );
}

function Contador({ etiqueta, valor, color }) {
  return (
    <Card style={{ flex: 1, padding: 12, marginBottom: 0 }}>
      <View accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
        <Text style={{ fontSize: 11, color: colors.sub, fontWeight: '600' }}>{etiqueta}</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color }}>{valor}</Text>
      </View>
    </Card>
  );
}
