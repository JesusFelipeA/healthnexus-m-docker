// Marco común de los 3 pasos de "Recuperar contraseña": volver, "Paso N de 3", barra de avance,
// ícono, título y descripción. El contenido de cada paso va como hijos.
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ico, colors, conTema } from '../../components/ui';

export const TOTAL_PASOS = 3;

export function Paso({ paso, icono, titulo, descripcion, onVolver, etiquetaVolver = 'Volver', children, pie }) {
  const s = estilos();
  return (
    <SafeAreaView style={s.pantalla} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.encabezado}>
            {onVolver ? (
              <Pressable onPress={onVolver} style={s.volver} hitSlop={6} accessibilityRole="button" accessibilityLabel={etiquetaVolver}>
                <Ico name="chevron-back" size={20} />
              </Pressable>
            ) : <View style={{ width: 44 }} />}
            {paso ? <Text style={s.pasoTexto}>Paso {paso} de {TOTAL_PASOS}</Text> : null}
          </View>

          {paso ? (
            <View style={s.barra} accessible accessibilityLabel={`Paso ${paso} de ${TOTAL_PASOS}`}>
              {Array.from({ length: TOTAL_PASOS }, (_, i) => (
                <View key={i} style={[s.segmento, i < paso && s.segmentoActivo]} />
              ))}
            </View>
          ) : null}

          <View style={s.cabecera}>
            {icono ? (
              <View style={s.icono}>
                <Ico name={icono} size={28} color={colors.teal} />
              </View>
            ) : null}
            {titulo ? <Text style={s.titulo} accessibilityRole="header">{titulo}</Text> : null}
            {descripcion ? <Text style={s.descripcion}>{descripcion}</Text> : null}
          </View>

          {children}

          {pie ? <View style={s.pie}>{pie}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Caja informativa (PIN del médico, "¿No fuiste tú?")
export function Nota({ icono = 'information-circle-outline', children }) {
  const s = estilos();
  return (
    <View style={s.nota}>
      <Ico name={icono} size={20} color={colors.sub} />
      <Text style={s.notaTexto}>{children}</Text>
    </View>
  );
}

const estilos = conTema((c) => StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28, gap: 22 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  volver: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  pasoTexto: { fontSize: 13, fontWeight: '600', color: c.sub },
  barra: { flexDirection: 'row', gap: 6, marginTop: -12 },
  segmento: { flex: 1, height: 4, borderRadius: 2, backgroundColor: c.modo === 'oscuro' ? c.line : '#DDE1EA' },
  segmentoActivo: { backgroundColor: c.teal },
  cabecera: { gap: 12 },
  icono: { width: 56, height: 56, borderRadius: 16, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  descripcion: { fontSize: 15, lineHeight: 22, color: c.sub },
  nota: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14 },
  notaTexto: { flex: 1, fontSize: 13, lineHeight: 19, color: c.sub },
  pie: { flexGrow: 1, justifyContent: 'flex-end' },
}));
