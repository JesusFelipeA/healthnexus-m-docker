import { mensajeApi } from '../utils/errors';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activarEmergencia } from '../api';
import { useAuth } from '../context/AuthContext';
import { getPositionDetail } from '../services/geolocation';
import { Ico } from './ui';

// Botón flotante de emergencia (visible solo con sesión iniciada)
export default function EmergencyButton() {
  const { user, can } = useAuth();
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);
  // Solo médico y enfermería pueden activar el código (la API también lo exige)
  if (!user || !can('medico', 'enfermeria')) return null;

  const send = async () => {
    setSending(true);
    try {
      // La ubicación es opcional: si tarda más de 3 s, se envía sin ella.
      const { pos } = await Promise.race([
        getPositionDetail({ timeout: 3000 }),
        new Promise((r) => setTimeout(() => r({ pos: null }), 3500)),
      ]);
      const r = await activarEmergencia('Código de emergencia activado desde la app móvil', pos || undefined);
      Alert.alert('🚨 Emergencia', `Código de emergencia registrado.${r && r.id ? `\nNo. de registro: ${r.id}` : ''}`);
    } catch (e) {
      if (Number(e && e.status) === 0) {
        Alert.alert(
          'Sin conexión',
          'Sin conexión: la emergencia NO se registró. Avisa por otro medio y reintenta.',
          [
            { text: 'Cerrar', style: 'cancel' },
            { text: 'Reintentar', onPress: send },
          ],
        );
      } else {
        Alert.alert('No se pudo activar', mensajeApi(e));
      }
    } finally {
      setSending(false);
    }
  };

  const ask = () => {
    if (sending) return;
    Alert.alert('Código de emergencia', '¿Activar el CÓDIGO DE EMERGENCIA?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Activar', style: 'destructive', onPress: send },
    ]);
  };

  return (
    <Pressable
      onPress={ask}
      accessibilityRole="button"
      accessibilityLabel="Código de emergencia"
      accessibilityHint="Registra una alerta de emergencia"
      style={({ pressed }) => [
        styles.btn,
        { bottom: 24 + insets.bottom, right: 24 + insets.right },
        sending && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
    >
      <Ico name="pulse" size={28} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC2626',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
