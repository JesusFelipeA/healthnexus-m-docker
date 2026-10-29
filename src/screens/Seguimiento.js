import React, { useEffect } from 'react';

import { Text, View } from 'react-native';

import { getSeguimiento } from '../api';

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

import { fmtMinutes } from '../utils/triage';

export default function Seguimiento() {
  const { data, loading, error, reload } = useFetch(getSeguimiento, []);

  // Se actualiza solo cada 30 segundos
  useEffect(() => {
    const t = setInterval(() => reload(true), 30000);
    return () => clearInterval(t);
  }, [reload]);

  const records = data || [];

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
      title="Seguimiento"
      icon="analytics-outline"
      iconColor={colors.amber}
    >
      <ErrorBox message={error} onRetry={reload} />

      {loading && !data ? (
        <Loading />
      ) : records.length === 0 ? (
        <Empty
          icon="analytics-outline"
          text="Aún no hay seguimientos registrados."
        />
      ) : (
        <>
          {paginated.map(s => (
            <Card key={s.id}>
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
                  {s.paciente}
                </Text>

                {s.estado ? (
                  <Badge
                    text={s.estado}
                    color={colors.amber}
                    bg={colors.amberTint}
                  />
                ) : null}
              </View>

              <View style={{ gap: 6 }}>
                {s.cama ? (
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
                      color={colors.amber}
                    />
                    <Text style={{ fontSize: 13, color: colors.sub }}>
                      {s.cama}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Ico name="time-outline" size={16} color={colors.amber} />
                  <Text style={{ fontSize: 13, color: colors.sub }}>
                    Hace {fmtMinutes(s.minutos)}
                  </Text>
                </View>

                {s.contenido ? (
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.sub,
                      backgroundColor: colors.bg,
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    {s.contenido}
                  </Text>
                ) : null}
              </View>
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
