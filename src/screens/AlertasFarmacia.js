import React from 'react';

import { Text, View } from 'react-native';

import { getAlertasFarmacia } from '../api';

import useFetch from '../hooks/useFetch';
import usePagination from '../hooks/usePagination';

import {
  Badge,
  Card,
  Empty,
  ErrorBox,
  Ico,
  Loading,
  Paginator,
  Screen,
  colors,
} from '../components/ui';

const TIPO = {
  sin_stock: { label: 'Sin stock', icon: 'close-circle-outline' },
  caducado: { label: 'Caducado', icon: 'skull-outline' },
  stock_bajo: { label: 'Stock bajo', icon: 'trending-down-outline' },
  por_caducar: { label: 'Por caducar', icon: 'hourglass-outline' },
};

export default function AlertasFarmacia() {
  const { data, loading, error, reload } = useFetch(getAlertasFarmacia, []);

  const records = data ? data.data : [];

  const {
    page,
    pageSize,
    totalItems,
    totalPages,
    paginated,
    setPage,
    setPageSize,
  } = usePagination(records, { initialPageSize: 10 });

  return (
    <Screen
      title="Alertas de inventario"
      icon="warning-outline"
      iconColor={colors.amber}
    >
      <ErrorBox message={error} onRetry={reload} />

      {loading && !data ? (
        <Loading />
      ) : records.length === 0 ? (
        <Empty
          icon="checkmark-circle-outline"
          text="Sin alertas: el inventario está en orden."
        />
      ) : (
        <>
          <Text
            style={{
              fontSize: 13,
              color: colors.sub,
              marginBottom: 16,
            }}
          >
            {data.total} alertas (se calculan al momento)
          </Text>

          {paginated.map((a, i) => {
            const t = TIPO[a.tipo] || {
              label: a.tipo,
              icon: 'alert-circle-outline',
            };
            const crit = a.nivel === 'critico';
            const color = crit ? colors.danger : colors.warning;

            return (
              <Card
                key={`${a.tipo}-${a.loteId || a.medicamentoId}-${i}`}
                accent={color}
                style={{ padding: 16 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <Ico name={t.icon} size={18} color={color} />

                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: colors.text,
                        flex: 1,
                      }}
                    >
                      {a.medicamento}
                    </Text>
                  </View>

                  <Badge
                    text={t.label}
                    color={color}
                    bg={crit ? colors.dangerTint : colors.warningTint}
                  />
                </View>

                <Text style={{ fontSize: 13, color: colors.sub }}>
                  {a.detalle}
                </Text>
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
