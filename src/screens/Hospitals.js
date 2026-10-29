import { mensajeApi } from '../utils/errors';
import React, { useState } from 'react';
import { Alert, Modal, Text, View } from 'react-native';
import { getHospitals, getPatients, reservarCama } from '../api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { MENSAJES_GPS, getPositionDetail } from '../services/geolocation';
import { Button, Card, Empty, ErrorBox, Ico, Loading, Screen, SelectField, colors } from '../components/ui';

export default function Hospitals() {
  const { can } = useAuth();
  const canRefer = can('medico');
  const [pacienteId, setPacienteId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  // Pide la ubicación (GPS) y ordena los hospitales por cercanía
  const [gpsMotivo, setGpsMotivo] = useState(null);
  const hospitals = useFetch(async () => {
    const { pos, motivo } = await getPositionDetail();
    setGpsMotivo(motivo);
    return getHospitals(pos);
  }, []);
  const patients = useFetch(async () => (can('medico', 'enfermeria') ? getPatients() : []), []);
  const list = hospitals.data || [];

  const refer = (h) => {
    if (!pacienteId) return setError('Selecciona primero el paciente a derivar.');
    Alert.alert('Confirmar reserva', `¿Reservar cama en ${h.nombre} para el paciente seleccionado?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reservar', onPress: () => doRefer(h) },
    ]);
  };

  const doRefer = async (h) => {
    setBusyId(h.id); setError('');
    try {
      const r = await reservarCama(h.id, Number(pacienteId));
      setTicket({ id: r.ticket, name: r.hospital, date: new Date().toLocaleString('es-ES') });
      hospitals.reload(true);
    } catch (e) { setError(mensajeApi(e)); } finally { setBusyId(null); }
  };

  const Row = ({ k, v }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ color: colors.sub }}>{k}</Text><Text style={{ fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right' }}>{v}</Text>
    </View>
  );

  return (
    <Screen title="Hospitales Cercanos" icon="location-outline" iconColor={colors.coral}>
      {canRefer && (
        <SelectField label="Paciente a derivar" icon="person-outline" value={pacienteId} onChange={setPacienteId} options={(patients.data || []).map((p) => ({ value: p.id, label: p.name }))} />
      )}
      {gpsMotivo ? <ErrorBox message={MENSAJES_GPS[gpsMotivo]} onRetry={hospitals.reload} /> : null}
      <ErrorBox message={error || hospitals.error} onRetry={hospitals.reload} />
      {hospitals.loading && !hospitals.data ? <Loading text="Buscando hospitales..." /> : list.length === 0 ? <Empty icon="location-outline" text="No hay hospitales registrados." /> : list.map((h) => {
        const ok = h.camasDisponibles > 0;
        return (
          <Card key={h.id} accent={ok ? colors.green : colors.red}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{h.nombre}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ico name="location-outline" size={14} color={colors.sub} />
                  <Text style={{ fontSize: 13, color: colors.sub }}>{h.distanciaKm != null ? `${h.distanciaKm} km` : 'Distancia no disponible'}{h.tieneUci ? ' · UCI' : ''}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ico name="bed-outline" size={16} color={ok ? colors.green : colors.red} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: ok ? colors.green : colors.red }}>{h.camasDisponibles} camas</Text>
              </View>
            </View>
            {canRefer ? (
              <Button variant={ok ? 'primary' : 'soft'} icon={ok ? 'car-outline' : undefined} title={ok ? 'Reservar cama' : 'Sin disponibilidad'} disabled={!ok} loading={busyId === h.id} onPress={() => refer(h)} style={{ marginTop: 16, height: 48 }} />
            ) : null}
          </Card>
        );
      })}

      <Modal visible={!!ticket} transparent animationType="fade" onRequestClose={() => setTicket(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          {ticket && (
            <View style={{ backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' }}>
              <View style={{ backgroundColor: colors.tealDeep, padding: 24, alignItems: 'center' }}>
                <Ico name="ticket-outline" size={40} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 8 }}>PASE DE SALIDA</Text>
              </View>
              <View style={{ padding: 24 }}>
                <Row k="Ticket No:" v={ticket.id} />
                <Row k="Hospital:" v={ticket.name} />
                <Row k="Fecha:" v={ticket.date} />
                <Text style={{ color: colors.coral, fontSize: 12, textAlign: 'center', marginVertical: 16 }}>Presente este ticket en recepción del hospital de destino.</Text>
                <Button title="Entendido" icon="checkmark-circle" onPress={() => setTicket(null)} />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </Screen>
  );
}
