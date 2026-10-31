import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Navegacion from '@react-navigation/native';
import { useMenu } from '../navigation/menuContext';
import { RUTAS_DE_MENU } from '../navigation/modulos';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, conTema, insigniaTriage } from '../theme/paletas';
import { triageInfo } from '../utils/triage';
export { default as Paginator } from './Paginator';

// `colors` es la paleta del tema actual (claro u oscuro): ver src/theme/paletas.js
export { colors, conTema };

export const shadow = { shadowColor: '#111A3A', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 };

export const Ico = ({ name, size = 20, color = colors.text, style }) => <Icon name={name} size={size} color={color} style={style} />;

// useRoute puede no existir en los mocks de las pruebas
const useRutaActual = typeof Navegacion.useRoute === 'function' ? Navegacion.useRoute : () => null;

// Pantalla con encabezado y contenido con scroll.
// En las pantallas que se abren desde la barra lateral, el encabezado muestra el botón de menú;
// en las demás (detalle, alta) muestra "Volver". `onRefresh` activa "deslizar para actualizar".
export function Screen({ title, subtitle, icon, iconColor = colors.teal, children, refreshing = false, onRefresh, right }) {
  const s = estilos();
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
          <Pressable onPress={() => nav.goBack()} hitSlop={12} style={s.back} accessibilityRole="button" accessibilityLabel="Volver">
            <Ico name="chevron-back" size={22} />
          </Pressable>
        )}
        {icon ? <Ico name={icon} size={20} color={iconColor} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} accessibilityRole="header" numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right || null}
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.teal]} tintColor={colors.teal} progressBackgroundColor={colors.surface} />
        ) : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Botón de hamburguesa que abre la barra lateral. No se muestra si no hay barra lateral. */
export function BotonMenu({ color = colors.text, style }) {
  const menu = useMenu();
  if (!menu) return null;
  return (
    <Pressable onPress={menu.abrir} hitSlop={12} style={style} accessibilityRole="button" accessibilityLabel="Abrir menú">
      <Ico name="menu-outline" size={24} color={color} />
    </Pressable>
  );
}

export const Card = ({ children, accent, style }) => (
  <View style={[estilos().card, accent ? { borderLeftWidth: 5, borderLeftColor: accent } : null, style]}>{children}</View>
);

export const Badge = ({ text, color, bg }) => (
  <View style={[estilos().badge, { backgroundColor: bg || `${color}26` }]}><Text style={[estilos().badgeText, { color }]}>{text}</Text></View>
);

const ROMANO = { rojo: 'I', naranja: 'II', amarillo: 'III', verde: 'IV', azul: 'V' };

// Nivel de triage: color + número + texto (nunca solo color, por accesibilidad)
export function TriageBadge({ nivel, compacto = false }) {
  const s = estilos();
  const info = triageInfo(nivel);
  const ins = insigniaTriage(ROMANO[nivel] ? nivel : 'sin');
  const texto = ROMANO[nivel] ? `${ROMANO[nivel]} · ${info.label}` : 'Sin triage';
  return (
    <View style={[s.triage, { backgroundColor: ins.bg }]} accessible accessibilityLabel={ROMANO[nivel] ? `Triage nivel ${ROMANO[nivel]}, ${info.label}` : 'Sin triage'}>
      <View style={[s.triageDot, { backgroundColor: ins.dot }]} />
      <Text style={[s.triageText, { color: ins.text }]} numberOfLines={1}>{compacto ? (ROMANO[nivel] || '—') : texto}</Text>
    </View>
  );
}

// Filtro tipo píldora
export function Chip({ label, active, onPress, dot, style }) {
  const s = estilos();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [s.chip, active && s.chipActivo, pressed && { opacity: 0.85 }, style]}
    >
      {dot ? <View style={[s.triageDot, { backgroundColor: dot }]} /> : null}
      <Text style={[s.chipTexto, active && s.chipTextoActivo]}>{label}</Text>
    </Pressable>
  );
}

// Control segmentado (Apariencia: Auto / Claro / Oscuro)
export function Segmented({ opciones, valor, onChange, etiqueta }) {
  const s = estilos();
  return (
    <View style={s.segmentado} accessibilityRole="radiogroup" accessibilityLabel={etiqueta}>
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="radio"
            accessibilityLabel={o.nombre}
            accessibilityState={{ checked: activo, selected: activo }}
            style={[s.segmento, activo && s.segmentoActivo]}
          >
            {o.icono ? <Ico name={o.icono} size={16} color={activo ? colors.tealDeep : colors.sub} /> : null}
            <Text style={[s.segmentoTexto, activo && s.segmentoTextoActivo]}>{o.nombre}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const SectionTitle = ({ children }) => <Text style={estilos().sectionTitle}>{children}</Text>;

export const Empty = ({ icon = 'folder-open-outline', text, hint }) => (
  <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 20 }}>
    <View style={estilos().emptyIcon}><Ico name={icon} size={30} color={colors.teal} /></View>
    <Text style={{ marginTop: 14, fontWeight: '700', fontSize: 15, color: colors.text, textAlign: 'center' }}>{text}</Text>
    {hint ? <Text style={{ marginTop: 6, fontSize: 13, color: colors.sub, textAlign: 'center' }}>{hint}</Text> : null}
  </View>
);

export const Loading = ({ text = 'Cargando...' }) => (
  <View style={{ alignItems: 'center', padding: 40 }}>
    <ActivityIndicator color={colors.teal} />
    <Text style={{ marginTop: 10, color: colors.sub, fontWeight: '600' }}>{text}</Text>
  </View>
);

// Filas de carga con la forma de las tarjetas (mejor que un spinner en listas)
export function Skeleton({ filas = 4 }) {
  const s = estilos();
  return (
    <View accessibilityLabel="Cargando" accessible>
      {Array.from({ length: filas }, (_, i) => (
        <View key={i} style={s.esqueleto}>
          <View style={[s.esqLinea, { width: '55%' }]} />
          <View style={[s.esqLinea, { width: '80%', height: 10, marginTop: 10 }]} />
        </View>
      ))}
    </View>
  );
}

export function ErrorBox({ message, onRetry }) {
  const s = estilos();
  if (!message) return null;
  return (
    <View style={s.errorBox} accessibilityRole="alert">
      <Ico name="alert-circle-outline" size={18} color={colors.danger} />
      <Text style={{ flex: 1, color: colors.dangerText, fontWeight: '600', fontSize: 13, lineHeight: 18 }}>{message}</Text>
      {onRetry ? <Pressable onPress={() => onRetry()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Reintentar"><Text style={{ color: colors.dangerText, fontWeight: '800' }}>Reintentar</Text></Pressable> : null}
    </View>
  );
}

// Aviso breve que se oculta solo (reemplaza a Alert.alert para confirmaciones)
export function Toast({ message, tipo = 'exito', onHide, duracion = 3000 }) {
  const s = estilos();
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!message) return undefined;
    Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => onHide && onHide(), duracion);
    return () => clearTimeout(t);
  }, [message, duracion, onHide, op]);
  if (!message) return null;
  const exito = tipo === 'exito';
  return (
    <Animated.View style={[s.toast, { opacity: op }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Ico name={exito ? 'checkmark-circle' : 'alert-circle'} size={20} color={exito ? colors.success : colors.danger} />
      <Text style={s.toastTexto}>{message}</Text>
    </Animated.View>
  );
}

// Campo de texto con etiqueta. El ícono va dentro del campo; con `password` muestra el botón de ver/ocultar.
export function Field({ label, icon, style, multiline, password, error, ...props }) {
  const s = estilos();
  const [foco, setFoco] = useState(false);
  const [ver, setVer] = useState(false);
  const secure = password ? !ver : props.secureTextEntry;
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={[s.inputBox, multiline && { minHeight: 100, alignItems: 'flex-start', paddingTop: 12 }, foco && s.inputFoco, error && s.inputError, style]}>
        {icon ? <Ico name={icon} size={20} color={foco ? colors.teal : colors.faint} /> : null}
        <TextInput
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          accessibilityLabel={props.accessibilityLabel || label}
          {...props}
          secureTextEntry={secure}
          onFocus={(e) => { setFoco(true); props.onFocus && props.onFocus(e); }}
          onBlur={(e) => { setFoco(false); props.onBlur && props.onBlur(e); }}
          style={[s.input, multiline ? { height: 88, textAlignVertical: 'top' } : null]}
        />
        {password ? (
          <Pressable onPress={() => setVer(!ver)} hitSlop={8} style={s.ojo} accessibilityRole="button" accessibilityLabel={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Ico name={ver ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.faint} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.campoError}>{error}</Text> : null}
    </View>
  );
}

// Lista desplegable (reemplaza al <select> de la web)
export function SelectField({ label, icon, value, options, onChange, placeholder = 'Selecciona...' }) {
  const s = estilos();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((o) => String(o.value) === String(value));
  const searchable = options.length > 8;
  const shown = search ? options.filter((o) => o.label.toLowerCase().includes(search.trim().toLowerCase())) : options;
  const close = () => { setOpen(false); setSearch(''); };
  return (
    <View style={{ marginBottom: 16 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <Pressable onPress={() => setOpen(true)} style={s.inputBox} accessibilityRole="button" accessibilityLabel={label ? `${label}: ${selected ? selected.label : placeholder}` : undefined}>
        {icon ? <Ico name={icon} size={20} color={colors.faint} /> : null}
        <Text style={{ color: selected ? colors.text : colors.placeholder, fontSize: 15, flex: 1 }} numberOfLines={1}>{selected ? selected.label : placeholder}</Text>
        <Ico name="chevron-down" size={18} color={colors.sub} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={s.overlay} onPress={close}>
          <View style={s.sheet}>
            {searchable ? (
              <TextInput value={search} onChangeText={setSearch} placeholder="Buscar..." placeholderTextColor={colors.placeholder} autoCorrect={false} style={[s.inputBox, s.input, { margin: 12, marginBottom: 4, paddingHorizontal: 14 }]} />
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

// variant: 'primary' | 'outline' | 'soft' | 'danger'
export function Button({ title, icon, onPress, variant = 'primary', color = colors.teal, disabled, loading, style }) {
  const s = estilos();
  const base = variant === 'primary' ? s.btnPrimary
    : variant === 'danger' ? [s.btnPrimary, { backgroundColor: colors.emergency }]
      : variant === 'outline' ? [s.btnOutline, { borderColor: color }] : s.btnSoft;
  const textColor = variant === 'primary' ? colors.onPrimary : variant === 'danger' ? '#FFFFFF' : variant === 'outline' ? color : colors.tealDeep;
  const inactivo = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactivo, busy: !!loading }}
      style={({ pressed }) => [base, disabled && !loading && variant === 'primary' && s.btnDeshabilitado, inactivo && { opacity: 0.7 }, pressed && !inactivo && { opacity: 0.88 }, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : (
        <>
          {icon ? <Ico name={icon} size={variant === 'soft' ? 18 : 20} color={disabled && variant === 'primary' ? colors.faint : textColor} /> : null}
          <Text style={{ color: disabled && variant === 'primary' ? colors.faint : textColor, fontWeight: '700', fontSize: variant === 'soft' ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const estilos = conTema((c) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, minHeight: 60, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line },
  back: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  headerTitle: { fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: -0.2 },
  headerSub: { fontSize: 12, color: c.sub, marginTop: 1 },
  content: { padding: 20, paddingBottom: 120 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.line },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  triage: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  triageDot: { width: 8, height: 8, borderRadius: 4 },
  triageText: { fontSize: 12, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, marginRight: 8 },
  chipActivo: { backgroundColor: c.mint, borderColor: c.teal },
  chipTexto: { fontSize: 13, fontWeight: '600', color: c.sub },
  chipTextoActivo: { color: c.tealDeep, fontWeight: '700' },
  segmentado: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 4, gap: 4 },
  segmento: { flex: 1, flexDirection: 'row', gap: 6, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentoActivo: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
  segmentoTexto: { fontSize: 13, fontWeight: '600', color: c.sub },
  segmentoTextoActivo: { color: c.tealDeep, fontWeight: '700' },
  sectionTitle: { marginBottom: 12, fontSize: 13, fontWeight: '700', color: c.sub, textTransform: 'uppercase', letterSpacing: 0.8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  esqueleto: { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 16, marginBottom: 12 },
  esqLinea: { height: 14, borderRadius: 7, backgroundColor: c.surfaceAlt },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.dangerTint, borderWidth: 1, borderColor: c.dangerBorder, borderRadius: 12, padding: 12, marginBottom: 16 },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 104, // por encima del botón de emergencia
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14, ...shadow, elevation: 6 },
  toastTexto: { flex: 1, color: c.text, fontWeight: '600', fontSize: 14 },
  label: { fontSize: 13, fontWeight: '600', color: c.label, marginBottom: 8 },
  inputBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: c.inputBorder, borderRadius: 12, paddingLeft: 14, paddingRight: 6, backgroundColor: c.surface },
  inputFoco: { borderWidth: 2, borderColor: c.teal },
  inputError: { borderColor: c.danger },
  input: { flex: 1, minHeight: 48, fontSize: 15, color: c.text, paddingVertical: 0 },
  ojo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  campoError: { color: c.dangerText, fontSize: 12, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: c.surface, borderRadius: 18, maxHeight: '70%', overflow: 'hidden' },
  option: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: c.line },
  btnPrimary: { height: 52, borderRadius: 12, backgroundColor: c.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDeshabilitado: { backgroundColor: c.surfaceAlt },
  btnOutline: { height: 52, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSoft: { marginTop: 12, minHeight: 44, paddingVertical: 10, borderRadius: 12, backgroundColor: c.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
}));
