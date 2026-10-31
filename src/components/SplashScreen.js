import React from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { colors, conTema } from './ui';

// Se muestra mientras se recupera la sesión guardada. Fondo blanco en los dos temas: es el del logo
// y el de la pantalla de inicio nativa (así no hay parpadeo).
export default function SplashScreen() {
  return (
    <View style={estilos().wrap}>
      <Image source={require('../img/logo-healthnexus.png')} style={estilos().logo} resizeMode="contain" accessibilityLabel="HealthNexus" />
      <ActivityIndicator color={colors.teal} size="large" style={estilos().spinner} />
    </View>
  );
}

const estilos = conTema(() => StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  logo: { width: 220, height: 220 },
  spinner: { marginTop: 24 },
}));
