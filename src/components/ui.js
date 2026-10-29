import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Navegacion from '@react-navigation/native';
import { useMenu } from '../navigation/menuContext';
import { RUTAS_DE_MENU } from '../navigation/modulos';
import Icon from 'react-native-vector-icons/Ionicons';
export { default as Paginator } from './Paginator';

export const colors = {
  // Tipografía
  text: '#102A6A',
  sub: '#4F5D7A',
  faint: '#8B96B2',

  // Colores principales HealthNexus
  teal: '#6B4DE6',       // Morado principal
  tealDeep: '#4E2CCF',   // Morado oscuro

  // Fondos suaves
  mint: '#EEE9FF',

  // Azul corporativo
  coral: '#102A6A',
  coralTint: '#E8EEFF',

  // Lavanda
  amber: '#B39DFF',
  amberTint: '#F4F1FF',

  // Base UI
  line: '#DDE4F0',
  bg: '#F7F9FC',

  // Estados
  green: '#22C55E',
  red: '#EF4444',

  // Significado clínico: peligro / advertencia / correcto (estados, caducidad, stock, auditoría)
  danger: '#DC2626',
  dangerTint: '#FDECEC',
  warning: '#B45309',
  warningTint: '#FEF3E2',
  success: '#15803D',
  successTint: '#E7F7EC',
};

export const shadow = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 };

export const Ico = ({ name, size = 20, color = colors.text, style }) => <Icon name={name} size={size} color={color} style={style} />;

// Pantalla con encabezado (botón volver + título) y contenido con scroll
// useRoute puede no existir en los mocks de las pruebas
const useRutaActual = typeof Navegacion.useRoute === 'function' ? Navegacion.useRoute : () => null;

// En las pantallas que se abren desde la barra lateral, el encabezado muestra el botón de menú;
// en las demás (detalle, alta) muestra "Volver".
export function Screen({ title, icon, iconColor = colors.teal, children }) {
  const nav = Navegacion.useNavigation();
  const route = useRutaActual();
  const menu = useMenu();
  const conMenu = !!menu && !!route && RUTAS_DE_MENU.has(route.name);
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        {conMenu ? (
          <BotonMenu style={s.back} />
        ) : (
          <Pressable onPress={() => nav.goBack()} hitSlop={12} style={s.back} accessibilityLabel="Volver">
            <Ico name="chevron-back" size={24} />
          </Pressable>
        )}
        {icon ? <Ico name={icon} size={22} color={iconColor} /> : null}
        <Text style={s.headerTitle} accessibilityRole="header">{title}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </SafeAreaView>
  );
}

/** Botón de hamburguesa que abre la barra lateral. No se muestra si no hay barra lateral. */
export function BotonMenu({ color = colors.text, style }) {
  const menu = useMenu();
  if (!menu) return null;
  return (
    <Pressable onPress={menu.abrir} hitSlop={12} style={style} accessibilityRole="button" accessibilityLabel="Abrir menú">
      <Ico name="menu-outline" size={26} color={color} />
    </Pressable>
  );
}

export const Card = ({ children, accent, style }) => (
  <View style={[s.card, accent ? { borderLeftWidth: 6, borderLeftColor: accent } : null, style]}>{children}</View>
);

export const Badge = ({ text, color, bg }) => (
  <View style={[s.badge, { backgroundColor: bg || `${color}26` }]}><Text style={[s.badgeText, { color }]}>{text}</Text></View>
);

export const SectionTitle = ({ children }) => <Text style={s.sectionTitle}>{children}</Text>;

export const Empty = ({ icon = 'folder-open-outline', text }) => (
  <View style={{ alignItems: 'center', marginTop: 50 }}>
    <Ico name={icon} size={60} color={colors.line} />
    <Text style={{ marginTop: 16, fontWeight: '600', color: colors.sub, textAlign: 'center' }}>{text}</Text>
  </View>
);

export const Loading = ({ text = 'Cargando...' }) => (
  <View style={{ alignItems: 'center', padding: 40 }}>
    <ActivityIndicator color={colors.teal} />
    <Text style={{ marginTop: 10, color: colors.sub, fontWeight: '600' }}>{text}</Text>
  </View>
);

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={s.errorBox}>
      <Ico name="alert-circle-outline" size={18} color={colors.danger} />
      <Text style={{ flex: 1, color: colors.danger, fontWeight: '600', fontSize: 13 }}>{message}</Text>
      {onRetry ? <Pressable onPress={() => onRetry()} accessibilityRole="button" accessibilityLabel="Reintentar"><Text style={{ color: colors.danger, fontWeight: '800' }}>Reintentar</Text></Pressable> : null}
    </View>
  );
}

// Campo de texto con etiqueta
export function Field({ label, icon, style, multiline, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <View style={s.labelRow}>
          {icon ? <Ico name={icon} size={16} color={colors.sub} /> : null}
          <Text style={s.label}>{label}</Text>
        </View>
      ) : null}
      <TextInput
        placeholderTextColor={colors.faint}
        multiline={multiline}
        style={[s.input, multiline ? { height: 100, paddingTop: 14, textAlignVertical: 'top' } : null, style]}
        {...props}
      />
    </View>
  );
}

// Lista desplegable (reemplaza al <select> de la web)
export function SelectField({ label, icon, value, options, onChange, placeholder = 'Selecciona...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((o) => String(o.value) === String(value));
  const searchable = options.length > 8;
  const shown = search ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase())) : options;
  const close = () => { setOpen(false); setSearch(''); };
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <View style={s.labelRow}>
          {icon ? <Ico name={icon} size={16} color={colors.sub} /> : null}
          <Text style={s.label}>{label}</Text>
        </View>
      ) : null}
      <Pressable onPress={() => setOpen(true)} style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={{ color: selected ? colors.text : colors.faint, fontSize: 15, flex: 1 }} numberOfLines={1}>{selected ? selected.label : placeholder}</Text>
        <Ico name="chevron-down" size={18} color={colors.sub} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={s.overlay} onPress={close}>
          <View style={s.sheet}>
            {searchable ? (
              <TextInput value={search} onChangeText={setSearch} placeholder="Buscar..." placeholderTextColor={colors.faint} autoCorrect={false} style={[s.input, { margin: 12, marginBottom: 4 }]} />
            ) : null}
            <FlatList
              keyboardShouldPersistTaps="handled"
              data={shown}
              keyExtractor={(o) => String(o.value)}
              ListEmptyComponent={<Text style={{ padding: 20, textAlign: 'center', color: colors.sub }}>No hay opciones disponibles.</Text>}
              renderItem={({ item }) => (
                <Pressable onPress={() => { onChange(String(item.value)); close(); }} style={s.option}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: String(item.value) === String(value) ? '800' : '500' }}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// variant: 'primary' | 'outline' | 'soft'
export function Button({ title, icon, onPress, variant = 'primary', color = colors.teal, disabled, loading, style }) {
  const base = variant === 'primary' ? s.btnPrimary : variant === 'outline' ? [s.btnOutline, { borderColor: color }] : s.btnSoft;
  const textColor = variant === 'primary' ? '#fff' : variant === 'outline' ? color : colors.tealDeep;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={({ pressed }) => [base, (disabled || loading) && { opacity: 0.6 }, pressed && !(disabled || loading) && { opacity: 0.88 }, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : (
        <>
          {icon ? <Ico name={icon} size={variant === 'soft' ? 18 : 20} color={textColor} /> : null}
          <Text style={{ color: textColor, fontWeight: '700', fontSize: variant === 'soft' ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}


const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 20,
  paddingVertical: 16,
  backgroundColor: '#fff',
  borderBottomWidth: 1,
  borderBottomColor: colors.line,
},
  back: { padding: 6, marginRight: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text, flexShrink: 1 },
  content: { padding: 24, paddingBottom: 120 },
  card: {
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 20,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: colors.line,
  ...shadow,
},
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sectionTitle: {
  marginBottom: 16,
  fontSize: 14,
  fontWeight: '700',
  color: colors.teal,
  textTransform: 'uppercase',
  letterSpacing: 1,
},
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerTint, borderRadius: 14, padding: 14, marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.sub },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 15, fontSize: 15, backgroundColor: '#fff', color: colors.text },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '70%', overflow: 'hidden' },
  option: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  btnPrimary: {
  height: 55,
  borderRadius: 16,
  backgroundColor: colors.teal,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  elevation: 4,
},
  btnOutline: { height: 55, borderRadius: 16, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSoft: {
  marginTop: 14,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: colors.amberTint,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
});
