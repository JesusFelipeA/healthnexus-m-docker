// Fin del flujo: la contraseña ya cambió y las sesiones anteriores de la app se cerraron.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Ico, conTema } from '../../components/ui';
import { Nota, Paso } from './Paso';

export default function RecuperarListo({ navigation }) {
  const s = estilos();
  const irALogin = () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  return (
    <Paso titulo="" pie={<Button title="Ir a iniciar sesión" icon="log-in-outline" onPress={irALogin} />}>
      <View style={s.centro}>
        <View style={s.halo}>
          <View style={s.circulo}>
            <Ico name="checkmark" size={34} color="#FFFFFF" />
          </View>
        </View>
        <Text style={s.titulo} accessibilityRole="header">Contraseña actualizada</Text>
        <Text style={s.texto}>
          Ya puedes iniciar sesión con tu contraseña nueva. Por seguridad, cerramos tu sesión en los demás dispositivos.
        </Text>
      </View>
      <Nota icono="shield-outline">
        ¿No fuiste tú? Avisa de inmediato a Sistemas: el cambio quedó registrado en la bitácora con la fecha y el dispositivo.
      </Nota>
    </Paso>
  );
}

const estilos = conTema((c) => StyleSheet.create({
  centro: { alignItems: 'center', gap: 16, marginTop: 40 },
  halo: { width: 88, height: 88, borderRadius: 44, backgroundColor: c.successTint, alignItems: 'center', justifyContent: 'center' },
  circulo: { width: 60, height: 60, borderRadius: 30, backgroundColor: c.modo === 'oscuro' ? '#2E9D52' : '#1E7A3C', alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.4, textAlign: 'center' },
  texto: { fontSize: 15, lineHeight: 22, color: c.sub, textAlign: 'center', maxWidth: 320 },
}));
