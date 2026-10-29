import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { getCuenta } from '../api';
import { Badge, Button, Card, Empty, ErrorBox, Ico, Loading, Screen, SectionTitle, colors } from '../components/ui';
import useFetch from '../hooks/useFetch';
import { compartirRecibo, guardarRecibo } from '../services/recibos';
import { METODO_PAGO, fmtMoney } from '../utils/dinero';
import { mensajeApi } from '../utils/errors';
import { fmtDateTime } from '../utils/triage';
import { BadgeEstado, Monto } from './Cuentas';

export default function CuentaDetalle({ route }) {
  const id = route && route.params ? route.params.id : null;
  const { data: c, loading, error, reload } = useFetch(() => getCuenta(id), [id]);
  const [ocupado, setOcupado] = useState(null);   // `${accion}-${pagoId}`

  async function ejecutar(accion, pago) {
    setOcupado(`${accion}-${pago.id}`);
    try {
      if (accion === 'guardar') {
        const r = await guardarRecibo(pago.id, pago.folio);
        Alert.alert('Recibo guardado', `${r.nombre} quedó en ${r.lugar}.`);
      } else {
        await compartirRecibo(pago.id, pago.folio);
      }
    } catch (e) {
      Alert.alert('No se pudo obtener el recibo', mensajeApi(e));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Screen title="Estado de cuenta" icon="wallet-outline">
      <ErrorBox message={error} onRetry={reload} />
      {loading && !c ? <Loading /> : !c ? (error ? null : <Empty icon="wallet-outline" text="Cuenta no encontrada." />) : (
        <>
          <Card accent={c.saldo > 0 ? colors.warning : colors.success} style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 }}>{c.paciente.nombre}</Text>
              <BadgeEstado estado={c.estado} />
            </View>
            <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>{c.folio}{c.paciente.curp ? ` · ${c.paciente.curp}` : ''}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
              <Monto etiqueta="Total" valor={c.total} />
              <Monto etiqueta="Pagado" valor={c.pagado} />
              <Monto etiqueta="Saldo" valor={c.saldo} destacar />
            </View>
            {c.descuento > 0 ? (
              <Text style={{ fontSize: 12, color: colors.sub, marginTop: 10 }}>
                Subtotal {fmtMoney(c.subtotal)} − descuento {fmtMoney(c.descuento)}{c.motivoDescuento ? ` (${c.motivoDescuento})` : ''}
              </Text>
            ) : null}
            {c.verificacion && !c.verificacion.coincide ? (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <Ico name="warning-outline" size={16} color={colors.danger} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.danger, fontWeight: '600' }}>
                  El saldo guardado no coincide con los pagos aplicados (calculado: {fmtMoney(c.verificacion.saldoCalculado)}). Avisa al área de caja.
                </Text>
              </View>
            ) : null}
          </Card>

          <SectionTitle>Cargos</SectionTitle>
          {c.cargos.length === 0 ? <Text style={{ color: colors.faint, marginBottom: 16 }}>Sin cargos registrados.</Text> : c.cargos.map((i) => (
            <Card key={i.id} style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.text }}>{i.concepto}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{fmtMoney(i.importe)}</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.faint, marginTop: 2 }}>{i.cantidad} × {fmtMoney(i.precioUnitario)}{i.descuento > 0 ? ` · desc. ${fmtMoney(i.descuento)}` : ''}</Text>
            </Card>
          ))}

          <SectionTitle>Pagos</SectionTitle>
          {c.pagos.length === 0 ? <Text style={{ color: colors.faint }}>Aún no hay pagos.</Text> : c.pagos.map((p) => (
            <Card key={p.id} accent={p.cancelado ? colors.danger : colors.success} style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: p.cancelado ? colors.faint : colors.text, textDecorationLine: p.cancelado ? 'line-through' : 'none' }}>{fmtMoney(p.monto)}</Text>
                {p.cancelado ? <Badge text="Cancelado" color={colors.danger} bg={colors.dangerTint} /> : <Badge text="Aplicado" color={colors.success} bg={colors.successTint} />}
              </View>
              <Text style={{ fontSize: 12, color: colors.sub, marginTop: 4 }}>
                {p.folio} · {METODO_PAGO[p.metodo] || p.metodo}{p.referencia ? ` · ${p.referencia}` : ''}
              </Text>
              <Text style={{ fontSize: 11, color: colors.faint, marginTop: 2 }}>
                {fmtDateTime(p.pagadoEn)}{p.cobradoPor ? ` · ${p.cobradoPor}` : ''}
              </Text>
              {p.cancelado && p.motivoCancelacion ? <Text style={{ fontSize: 12, color: colors.danger, marginTop: 4 }}>Motivo: {p.motivoCancelacion}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <Button variant="outline" icon="download-outline" title="Descargar" loading={ocupado === `guardar-${p.id}`} disabled={!!ocupado} onPress={() => ejecutar('guardar', p)} style={{ flex: 1 }} />
                <Button variant="soft" icon="share-social-outline" title="Compartir" loading={ocupado === `compartir-${p.id}`} disabled={!!ocupado} onPress={() => ejecutar('compartir', p)} style={{ flex: 1 }} />
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
