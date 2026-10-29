import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState('');

  const checkApi = async () => {
    try {
      const { data } = await api.get('/health');
      setHealth(`API: ${data.status} · BD: ${data.db}`);
    } catch {
      setHealth('Sin conexión con la API');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hola, {user?.nombre}</Text>
      <Text style={styles.subtitle}>Rol: {user?.rol}</Text>

      <TouchableOpacity style={styles.button} onPress={checkApi}>
        <Text style={styles.buttonText}>Probar conexión</Text>
      </TouchableOpacity>
      {health ? <Text style={styles.health}>{health}</Text> : null}

      <TouchableOpacity style={[styles.button, styles.logout]} onPress={logout}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 32, color: '#666' },
  button: { backgroundColor: '#1565c0', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  logout: { backgroundColor: '#c62828' },
  buttonText: { color: '#fff', fontWeight: '600' },
  health: { textAlign: 'center', marginBottom: 24 },
});