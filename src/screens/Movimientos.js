import { mensajeApi } from '../utils/errors';
import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { createMovimiento, getMovimientos } from '../api';

import { useAuth } from '../context/AuthContext';

import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Loading,
  Screen,
  SelectField,
  colors,
} from '../components/ui';

import { fmtDateTime } from '../utils/triage';

const TIPOS = [
  { value: 'entrada', label: 'Entrada (suma)' },
  { value: 'salida', label: 'Salida (resta)' },
  { value: 'devolucion', label: 'Devolución (suma)' },
  { value: 'ajuste', label: 'Ajuste (nueva cantidad del lote)' },
];

const COLOR = {
  entrada: colors.success,
  devolucion: colors.teal,
  salida: colors.danger,
  ajuste: colors.warning,
};

const FILTERS = [
  ['', 'Todos'],
  ['entrada', 'Entradas'],
  ['salida', 'Salidas'],
  ['ajuste', 'Ajustes'],
  ['devolucion', 'Devoluciones'],
];

export default function Movimientos({ route, navigation }) {
  const { can } = useAuth();
  const lote = route.params?.lote;

  const [tipo, setTipo] = useState('salida');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [filtro]);

  useEffect(() => {
    let alive = true;
    const isFirstPage = page === 1;

    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    setError('');

    getMovimientos({ tipo: filtro, page, limit: 30 })
      .then(r => {
        if (!alive) return;
        setTotal(r.total);
        setRows(prev => (isFirstPage ? r.data : [...prev, ...r.data]));
      })
      .catch(e => alive && setError(mensajeApi(e)))
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setLoadingMore(false);
      });

    return () => {
      alive = false;
    };
  }, [filtro, page, reload]);

  const save = async () => {
    const n = Number(cantidad);

    if (
      cantidad === '' ||
      !Number.isInteger(n) ||
      n < (tipo === 'ajuste' ? 0 : 1)
    )
      return setFormError('Ingresa una cantidad válida (número entero).');

    if ((tipo === 'salida' || tipo === 'ajuste') && motivo.trim().length < 3)
      return setFormError('El motivo es obligatorio para salidas y ajustes.');

    setBusy(true);
    setFormError('');

    try {
      const r = await createMovimiento({
        loteId: lote.id,
        tipo,
        cantidad: n,
        motivo: motivo.trim(),
      });

      Alert.alert(
        'Movimiento registrado',
        `${r.medicamento}\nStock: ${r.stockAnterior} → ${r.stockNuevo}`,
      );

      setCantidad('');
      setMotivo('');
      navigation.setParams({ lote: undefined });
      setPage(1);
      setReload(x => x + 1);
    } catch (e) {
      setFormError(mensajeApi(e));
    } finally {
      setBusy(false);
    }
  };

  const hasMore = rows.length < total;
  const progress = total > 0 ? rows.length / total : 0;

  return (
    <Screen
      title="Movimientos"
      icon="swap-vertical-outline"
      iconColor={colors.teal}
    >
      {/* ===== FORM ===== */}
      {can('farmacia') && lote ? (
        <Card>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.sub,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            Nuevo movimiento
          </Text>

          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.text,
            }}
          >
            {lote.medicamento}
          </Text>

          <Text
            style={{
              fontSize: 13,
              color: colors.sub,
              marginBottom: 16,
            }}
          >
            Lote {lote.lote} · Disponible: {lote.disponible}
          </Text>

          <ErrorBox message={formError} />

          <SelectField
            label="Tipo"
            value={tipo}
            onChange={setTipo}
            options={TIPOS}
          />

          <Field
            label={tipo === 'ajuste' ? 'Nueva cantidad del lote' : 'Cantidad'}
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="number-pad"
            placeholder="Ej: 10"
          />

          <Field
            label="Motivo"
            value={motivo}
            onChangeText={setMotivo}
            placeholder={
              tipo === 'salida' || tipo === 'ajuste'
                ? 'Obligatorio'
                : 'Opcional'
            }
          />

          <Button
            title="Registrar"
            icon="checkmark-circle-outline"
            onPress={save}
            loading={busy}
          />

          <Button
            title="Cancelar"
            variant="outline"
            color={colors.coral}
            onPress={() => {
              navigation.setParams({ lote: undefined });
              setFormError('');
            }}
            style={{ marginTop: 10 }}
          />
        </Card>
      ) : can('farmacia') ? (
        <Text
          style={{
            fontSize: 13,
            color: colors.sub,
            backgroundColor: colors.mint,
            padding: 14,
            borderRadius: 14,
            marginBottom: 16,
          }}
        >
          Para registrar un movimiento, abre «Existencias por lote» y elige el
          lote.
        </Text>
      ) : null}

      {/* ===== FILTROS ===== */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16, flexGrow: 0 }}
      >
        {FILTERS.map(([id, label]) => {
          const active = filtro === id;
          return (
            <Pressable
              key={id || 'all'}
              onPress={() => setFiltro(id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                backgroundColor: active ? colors.teal : '#fff',
              }}
            >
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 12,
                  color: active ? '#fff' : colors.sub,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ===== CONTADOR + BARRA DE PROGRESO ===== */}
      {!loading && rows.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.sub }}>
              Mostrando{' '}
              <Text style={{ fontWeight: '800', color: colors.text }}>
                {rows.length}
              </Text>{' '}
              de{' '}
              <Text style={{ fontWeight: '800', color: colors.text }}>
                {total}
              </Text>{' '}
              movimientos
            </Text>

            {!hasMore && (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: colors.green,
                  letterSpacing: 0.3,
                }}
              >
                ✓ TODO CARGADO
              </Text>
            )}
          </View>

          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.line,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.min(progress * 100, 100)}%`,
                height: '100%',
                backgroundColor: colors.teal,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      )}

      <ErrorBox message={error} />

      {/* ===== LISTA ===== */}
      {loading && rows.length === 0 ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          icon="swap-vertical-outline"
          text="No hay movimientos registrados."
        />
      ) : (
        <>
          {rows.map(m => (
            <Card
              key={m.id}
              accent={COLOR[m.tipo] || colors.line}
              style={{ padding: 16 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: colors.text,
                    flex: 1,
                  }}
                >
                  {m.medicamento}
                </Text>

                <Badge
                  text={`${m.tipo} · ${m.cantidad}`}
                  color={COLOR[m.tipo] || colors.sub}
                />
              </View>

              <Text style={{ fontSize: 13, color: colors.sub }}>
                Stock {m.stockAnterior} → {m.stockNuevo}
                {m.lote ? ` · Lote ${m.lote}` : ''}
              </Text>

              {m.motivo ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.sub,
                    marginTop: 4,
                  }}
                >
                  {m.motivo}
                </Text>
              ) : null}

              <Text
                style={{
                  fontSize: 11,
                  color: colors.faint,
                  marginTop: 8,
                }}
              >
                {fmtDateTime(m.fecha)}
                {m.usuario ? ` · ${m.usuario}` : ''}
              </Text>
            </Card>
          ))}

          {/* ===== CARGAR MÁS ===== */}
          {hasMore && (
            <Pressable
              onPress={() => !loadingMore && setPage(page + 1)}
              disabled={loadingMore}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 14,
                backgroundColor: colors.mint,
                marginTop: 6,
                opacity: loadingMore ? 0.7 : 1,
              }}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.tealDeep} />
              ) : (
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: colors.tealDeep,
                  }}
                >
                  ↓ Cargar más
                </Text>
              )}

              {!loadingMore && (
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.tealDeep,
                    opacity: 0.7,
                  }}
                >
                  ({rows.length} / {total})
                </Text>
              )}
            </Pressable>
          )}
        </>
      )}
    </Screen>
  );
}
