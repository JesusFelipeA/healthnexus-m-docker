// Detalle de una receta: farmacia revisa existencias, ajusta unidades y la dispensa; el administrador puede revertirla.
// La API hace todo en una transacción (si falta stock de un medicamento no descuenta nada).
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { dispensarReceta, getReceta, revertirDispensacion } from '../api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { Badge, Button, Card, Empty, ErrorBox, Field, Ico, Loading, Screen, SectionTitle, colors } from '../components/ui';
import { mensajeApi } from '../utils/errors';
import { fmtDateTime } from '../utils/triage';
import { BadgeDispensada } from './Recetas';

export const MAX_UNIDADES = 100;

const MENSAJE_POR_CODIGO = {
  SIN_STOCK: (e) => `${e.message}. Registra una entrada en Movimientos o pide al médico un sustituto.`,
  YA_DISPENSADA: () => 'Otra persona ya dispensó esta receta. Se actualizó la información.',
  SIN_RECETA: () => 'Esta consulta ya no tiene medicamentos ni receta libre.',
  CONSULTA_NO_FINALIZADA: () => 'El médico todavía no finaliza la consulta.',
  NO_DISPENSADA: () => 'La receta ya estaba pendiente. Se actualizó la información.',
};
const mensaje = (e) => {
  const porCodigo = e && Number(e.status) === 409 && MENSAJE_POR_CODIGO[e.code];
  return porCodigo ? porCodigo(e) : mensajeApi(e);
};

/** Unidades a enviar a la API: solo las que no son 1 (la API usa 1 por defecto, como la web). */
export function unidadesParaApi(unidades) {
  const r = {};
  for (const [id, n] of Object.entries(unidades)) if (n !== 1) r[id] = n;
  return Object.keys(r).length ? r : undefined;
}

export default function RecetaDetalle({ route }) {
  const id = route && route.params ? route.params.id : null;
  const { user, can } = useAuth();
  const esAdmin = !!user && user.rol === 'administrador';
  const { data: r, loading, error, reload } = useFetch(() => getReceta(id), [id]);
  const [unidades, setUnidades] = useState({});
  const [notas, setNotas] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  // Una unidad por medicamento al cargar (como la web)
  useEffect(() => {
    if (!r) return;
    const u = {};
    for (const m of r.medicamentos) u[m.medicamentoId] = 1;
    setUnidades(u);
  }, [r]);

  const cambiar = (medId, delta) => setUnidades((u) => ({ ...u, [medId]: Math.min(MAX_UNIDADES, Math.max(1, (u[medId] || 1) + delta)) }));
  const faltantes = r ? r.medicamentos.filter((m) => m.disponible < (unidades[m.medicamentoId] || 1)) : [];
  const totalUnidades = r ? r.medicamentos.reduce((s, m) => s + (unidades[m.medicamentoId] || 1), 0) : 0;

  const ejecutarDispensar = async () => {
    setOcupado(true); setAviso('');
    try {
      const res = await dispensarReceta(id, { notas: notas.trim() || undefined, unidades: unidadesParaApi(unidades) });
      const detalle = res.medicamentos.length
        ? res.medicamentos.map((m) => `• ${m.medicamento}: −${m.unidades} (quedan ${m.stockNuevo})`).join('\n')
        : 'Receta libre: no se descontó inventario.';
      Alert.alert('Receta dispensada', detalle);
      setNotas('');
      reload(true);
    } catch (e) {
      setAviso(mensaje(e));
      if (e && (e.code === 'YA_DISPENSADA' || e.code === 'SIN_RECETA')) reload(true);
    } finally { setOcupado(false); }
  };

  const dispensar = () => {
    if (notas.trim().length > 500) return setAviso('Las notas no pueden superar 500 caracteres.');
    if (faltantes.length) return setAviso(`No hay existencias suficientes de ${faltantes.map((m) => m.nombre).join(', ')}.`);
    const texto = r.medicamentos.length
      ? `Se descontarán ${totalUnidades} ${totalUnidades === 1 ? 'unidad' : 'unidades'} del inventario.`
      : 'Es una receta libre: no se descuenta inventario.';
    Alert.alert('Dispensar receta', `${texto} ¿Continuar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Dispensar', onPress: ejecutarDispensar },
    ]);
  };

  const ejecutarRevertir = async () => {
    setOcupado(true); setAviso('');
    try {
      const res = await revertirDispensacion(id);
      const detalle = res.devueltos.length ? res.devueltos.map((d) => `• ${d.medicamento}: +${d.unidades}`).join('\n') : 'No había inventario que devolver.';
      Alert.alert('Dispensación revertida', detalle);
      reload(true);
    } catch (e) {
      setAviso(mensaje(e));
      if (e && e.code === 'NO_DISPENSADA') reload(true);
    } finally { setOcupado(false); }
  };

  const revertir = () => Alert.alert('Revertir dispensación', 'Las unidades vuelven a sus lotes y la receta queda pendiente. ¿Continuar?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Revertir', style: 'destructive', onPress: ejecutarRevertir },
  ]);

  const puedeDispensar = can('farmacia');

  return (
    <Screen title="Receta" icon="document-text-outline">
      <ErrorBox message={error} onRetry={reload} />
      {loading && !r ? <Loading /> : !r ? (error ? null : <Empty icon="document-text-outline" text="Receta no encontrada." />) : (
        <>
          <Card accent={r.dispensada ? colors.success : colors.warning} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 }}>{r.paciente}</Text>
              <BadgeDispensada dispensada={r.dispensada} />
            </View>
            <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>Receta #{r.id}{r.curp ? ` · ${r.curp}` : ''}</Text>
            <Text style={{ fontSize: 13, color: colors.sub, marginTop: 8 }}>{r.medico ? `${r.medico} · ` : ''}{fmtDateTime(r.fecha)}</Text>
            {r.diagnostico ? <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>Diagnóstico: {r.diagnostico}</Text> : null}
            {r.dispensada ? (
              <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600', marginTop: 8 }}>
                Dispensada {fmtDateTime(r.dispensadaEn)}{r.dispensadaPor ? ` por ${r.dispensadaPor}` : ''}
              </Text>
            ) : null}
            {r.dispensada && r.notasDispensacion ? <Text style={{ fontSize: 12, color: colors.sub, marginTop: 4 }}>Notas: {r.notasDispensacion}</Text> : null}
          </Card>

          {r.medicamentos.length ? <SectionTitle>Medicamentos</SectionTitle> : null}
          {r.medicamentos.map((m) => {
            const n = unidades[m.medicamentoId] || 1;
            const falta = !r.dispensada && m.disponible < n;
            return (
              <Card key={m.medicamentoId} accent={falta ? colors.danger : undefined} style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.text }}>
                    {m.nombre}{m.concentracion ? ` ${m.concentracion}` : ''}
                  </Text>
                  {m.controlado ? <Badge text="Controlado" color={colors.danger} bg={colors.dangerTint} /> : null}
                </View>
                {m.presentacion ? <Text style={{ fontSize: 12, color: colors.faint }}>{m.presentacion}</Text> : null}
                <Text style={{ fontSize: 13, color: colors.sub, marginTop: 6 }}>
                  {[m.dosis, m.via, m.frecuencia, m.duracion].filter(Boolean).join(' · ') || 'Sin indicaciones de dosis'}
                </Text>
                {m.indicaciones ? <Text style={{ fontSize: 12, color: colors.sub, marginTop: 2 }}>{m.indicaciones}</Text> : null}
                {!r.dispensada ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: falta ? colors.danger : colors.sub }}>
                      Disponible: {m.disponible}{falta ? ' (insuficiente)' : ''}
                    </Text>
                    {puedeDispensar ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Paso icono="remove" etiqueta={`Menos ${m.nombre}`} disabled={n <= 1 || ocupado} onPress={() => cambiar(m.medicamentoId, -1)} />
                        <Text style={{ minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '800', color: colors.text }} accessibilityLabel={`${n} unidades de ${m.nombre}`}>{n}</Text>
                        <Paso icono="add" etiqueta={`Más ${m.nombre}`} disabled={n >= MAX_UNIDADES || ocupado} onPress={() => cambiar(m.medicamentoId, 1)} />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })}

          {r.recetaLibre ? (
            <>
              <SectionTitle>Receta libre</SectionTitle>
              <Card style={{ padding: 14 }}><Text style={{ fontSize: 14, color: colors.text }}>{r.recetaLibre}</Text></Card>
            </>
          ) : null}

          <ErrorBox message={aviso} />
          {!r.dispensada && puedeDispensar ? (
            <>
              <Field label="Notas de dispensación (opcional)" value={notas} onChangeText={setNotas} placeholder="Ej. Entregado al familiar" multiline maxLength={500} />
              <Button title="Dispensar receta" icon="checkmark-done-outline" loading={ocupado} disabled={faltantes.length > 0} onPress={dispensar} />
            </>
          ) : null}
          {r.dispensada && esAdmin ? (
            <Button variant="outline" color={colors.danger} icon="arrow-undo-outline" title="Revertir dispensación" loading={ocupado} onPress={revertir} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Paso({ icono, etiqueta, disabled, onPress }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" accessibilityLabel={etiqueta} accessibilityState={{ disabled: !!disabled }}
      style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, opacity: disabled ? 0.4 : 1 }}>
      <Ico name={icono} size={18} color={colors.teal} />
    </Pressable>
  );
}
