import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { colors } from './ui';

// Se muestra mientras se recupera la sesión guardada. Fondo blanco: es el mismo del logo y de la pantalla de inicio nativa.
export default function SplashScreen() {
  return (
    <View style={styles.wrap}>
      <Image source={require('../img/logo-healthnexus.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="HealthNexus" />
      <ActivityIndicator color={colors.teal} size="large" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  logo: { width: 220, height: 220 },
  spinner: { marginTop: 24 },
});
