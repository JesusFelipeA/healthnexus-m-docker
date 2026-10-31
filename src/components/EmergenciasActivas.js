import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { atenderEmergencia, getEmergenciasActivas } from '../api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { alCambiarEmergencias } from '../services/avisosEmergencia';
import { mensajeApi } from '../utils/errors';
import { horaCorta, tiempoTranscurrido, urlMapa } from '../utils/emergencias';
import { Ico, colors, conTema } from './ui';

// Cada cuánto se vuelve a consultar mientras el Dashboard está abierto (además de los avisos push)
export const INTERVALO_MS = 30000;

// Emergencias activas en el Dashboard: quién activó el código, a qué hora, dónde, y botón para atenderla.
// Solo médico y enfermería (y administrador); farmacia no recibe emergencias.
export default function EmergenciasActivas() {
  const { can } = useAuth();
  const permitido = can('medico', 'enfermeria');
  const { data, reload } = useFetch(() => (permitido ? getEmergenciasActivas() : Promise.resolve([])), [permitido]);
  const [atendiendo, setAtendiendo] = useState(null);

  useEffect(() => {
    if (!permitido) return undefined;
    const recargar = () => reload(true);
    const intervalo = setInterval(recargar, INTERVALO_MS);
    const quitarAviso = alCambiarEmergencias(recargar);
    const app = AppState.addEventListener('change', (estado) => { if (estado === 'active') recargar(); });
    return () => {
      clearInterval(intervalo);
      quitarAviso();
      app.remove();
    };
  }, [permitido, reload]);

  const lista = Array.isArray(data) ? data : [];
  if (!permitido || lista.length === 0) return null;

  const atender = (e) => {
    Alert.alert('Atender emergencia', `¿Marcar como atendida la emergencia de las ${horaCorta(e.creada)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Atender',
        onPress: async () => {
          setAtendiendo(e.id);
          try {
            await atenderEmergencia(e.id);
          } catch (err) {
            Alert.alert('No se pudo atender', Number(err && err.status) === 404 ? 'Otra persona ya la atendió.' : mensajeApi(err));
          } finally {
            setAtendiendo(null);
            reload(true);
          }
        },
      },
    ]);
  };

  const abrirMapa = (e) => {
    const url = urlMapa(e.ubicacion);
    if (url) Linking.openURL(url).catch(() => Alert.alert('Ubicación', 'No se pudo abrir la app de mapas.'));
  };

  const s = estilos();
  return (
    <View style={s.box} accessibilityRole="alert">
      <View style={s.header}>
        <View style={s.icono}>
          <Ico name="pulse" size={18} color="#FFFFFF" />
        </View>
        <Text style={s.headerText}>
          {lista.length === 1 ? '1 emergencia activa' : `${lista.length} emergencias activas`}
        </Text>
        <Text style={s.hace}>{tiempoTranscurrido(lista[0].creada)}</Text>
      </View>

      {lista.map((e, i) => (
        <View key={e.id} style={[s.item, i === lista.length - 1 && s.itemUltimo]}>
          <Text style={s.mensaje}>{e.mensaje}</Text>
          <Text style={s.detalle}>
            {e.activadaPor ? `Activó ${e.activadaPor} · ` : ''}
            {horaCorta(e.creada)} ({tiempoTranscurrido(e.creada)})
          </Text>

          <View style={s.acciones}>
            {urlMapa(e.ubicacion) ? (
              <Pressable
                style={({ pressed }) => [s.btn, s.btnSecundario, pressed && s.pressed]}
                onPress={() => abrirMapa(e)}
                accessibilityRole="button"
                accessibilityLabel={`Ver ubicación de la emergencia ${e.id}`}
              >
                <Ico name="location-outline" size={18} color={colors.emergencyText} />
                <Text style={[s.btnText, s.textoPeligro]}>Ver ubicación</Text>
              </Pressable>
            ) : (
              <View style={[s.btn, s.sinUbicacionCaja]}>
                <Text style={s.sinUbicacion}>Sin ubicación</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [s.btn, s.btnPrimario, pressed && s.pressed, atendiendo === e.id && s.ocupado]}
              onPress={() => atender(e)}
              disabled={atendiendo === e.id}
              accessibilityRole="button"
              accessibilityLabel={`Atender emergencia ${e.id}`}
            >
              <Ico name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={[s.btnText, s.textoBlanco]}>{atendiendo === e.id ? 'Atendiendo...' : 'Atender'}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

// Colores de la maqueta: tarjeta roja tenue con acciones grandes (44 px o más)
const estilos = conTema((c) => StyleSheet.create({
  box: {
    backgroundColor: c.emergencyTint,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: c.emergencyLine,
    marginBottom: 20,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 14 },
  icono: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.emergency, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, color: c.emergencyText, fontSize: 15, fontWeight: '700' },
  hace: { color: c.emergencyText, fontSize: 12 },
  item: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.emergencyLine },
  mensaje: { fontSize: 15, fontWeight: '700', color: c.text },
  detalle: { fontSize: 13, color: c.sub, marginTop: 4 },
  acciones: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  btn: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12 },
  btnPrimario: { backgroundColor: c.emergency },
  btnSecundario: { borderWidth: 1.5, borderColor: c.emergencyLine, backgroundColor: c.modo === 'oscuro' ? 'transparent' : c.surface },
  sinUbicacionCaja: { borderWidth: 1, borderColor: c.emergencyLine, borderStyle: 'dashed' },
  btnText: { fontSize: 14, fontWeight: '700' },
  sinUbicacion: { fontSize: 13, color: c.sub },
  pressed: { opacity: 0.8 },
  itemUltimo: { borderBottomWidth: 0 },
  ocupado: { opacity: 0.6 },
  textoPeligro: { color: c.emergencyText },
  textoBlanco: { color: '#FFFFFF' },
}));
