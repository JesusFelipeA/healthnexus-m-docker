// Barra lateral desplegable (reemplaza la cuadrícula de módulos del dashboard).
// Se abre con el botón de menú o deslizando desde el borde izquierdo; se cierra tocando
// fuera, deslizando a la izquierda o con el botón "atrás" de Android.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Ico, colors } from '../components/ui';
import { INICIO, RUTAS_DE_MENU, seccionesVisibles } from './modulos';
import { MenuContext } from './menuContext';

const ROL = { administrador: 'Administrador', medico: 'Médico', enfermeria: 'Enfermería', farmacia: 'Farmacia' };
const BORDE = 20; // ancho de la franja izquierda que abre el menú al deslizar
const DURACION = 240;

export function MenuProvider({ navigationRef, rutaActual, children }) {
  const { user, can, logout } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const ancho = Math.min(Math.round(width * 0.82), 340);

  const [abierto, setAbierto] = useState(false);
  const [visible, setVisible] = useState(false); // sigue montado mientras corre la animación de cierre
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const x = useRef(new Animated.Value(-ancho)).current;

  const animar = useCallback(
    (destino, alTerminar) => {
      Animated.timing(x, {
        toValue: destino,
        duration: DURACION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(alTerminar);
    },
    [x],
  );

  const abrir = useCallback(() => {
    setVisible(true);
    setAbierto(true);
    animar(0);
  }, [animar]);

  const cerrar = useCallback(() => {
    setAbierto(false);
    animar(-ancho, () => {
      setVisible(false);
      setBuscando(false);
      setBusqueda('');
    });
  }, [animar, ancho]);

  // Al cerrar sesión, el menú se cierra
  useEffect(() => {
    if (!user) {
      x.setValue(-ancho);
      setAbierto(false);
      setVisible(false);
    }
  }, [user, x, ancho]);

  // Botón "atrás" de Android: primero cierra el menú
  useEffect(() => {
    if (!abierto) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cerrar();
      return true;
    });
    return () => sub.remove();
  }, [abierto, cerrar]);

  // Navegar desde el menú: la pila queda [Inicio, módulo], así "atrás" siempre regresa al inicio.
  const irA = useCallback(
    (ruta) => {
      cerrar();
      const nav = navigationRef && navigationRef.current;
      if (!nav || !nav.isReady()) return;
      if (ruta === rutaActual) return;
      nav.reset({
        index: ruta === INICIO.id ? 0 : 1,
        routes: ruta === INICIO.id ? [{ name: INICIO.id }] : [{ name: INICIO.id }, { name: ruta }],
      });
    },
    [cerrar, navigationRef, rutaActual],
  );

  const confirmarSalida = () => {
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => { cerrar(); logout(); } },
    ]);
  };

  // Deslizar desde el borde izquierdo abre; deslizar el panel a la izquierda cierra.
  const gestoAbrir = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx > 8 && Math.abs(g.dy) < 20,
        onPanResponderGrant: () => setVisible(true),
        onPanResponderMove: (_, g) => x.setValue(Math.min(0, -ancho + Math.max(0, g.dx))),
        onPanResponderRelease: (_, g) => (g.dx > ancho * 0.3 || g.vx > 0.5 ? abrir() : cerrar()),
        onPanResponderTerminate: () => cerrar(),
      }),
    [x, ancho, abrir, cerrar],
  );
  const gestoCerrar = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => x.setValue(Math.min(0, g.dx)),
        onPanResponderRelease: (_, g) => (g.dx < -ancho * 0.3 || g.vx < -0.5 ? cerrar() : abrir()),
        onPanResponderTerminate: () => abrir(),
      }),
    [x, ancho, abrir, cerrar],
  );

  const disponible = !!user && RUTAS_DE_MENU.has(rutaActual);
  const valor = useMemo(
    () => (user ? { abrir, cerrar, abierto, rutaActual, irA } : null),
    [user, abrir, cerrar, abierto, rutaActual, irA],
  );

  const secciones = user ? seccionesVisibles(can, busqueda) : [];
  const opacidadFondo = x.interpolate({ inputRange: [-ancho, 0], outputRange: [0, 1], extrapolate: 'clamp' });
  const inicial = (user?.nombre || 'U').trim().charAt(0).toUpperCase();

  const Item = ({ id, title, icon, iconActivo }) => {
    const activo = rutaActual === id;
    return (
      <Pressable
        onPress={() => irA(id)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ selected: activo }}
        style={({ pressed }) => [s.item, activo && s.itemActivo, pressed && !activo && s.itemPresionado]}
      >
        <Ico name={activo ? iconActivo : icon} size={22} color={activo ? colors.tealDeep : colors.text} />
        <Text style={[s.itemTexto, activo && s.itemTextoActivo]} numberOfLines={1}>{title}</Text>
      </Pressable>
    );
  };

  return (
    <MenuContext.Provider value={valor}>
      {children}

      {/* Franja del borde izquierdo para abrir deslizando */}
      {disponible && !abierto ? <View style={[s.borde, { top: insets.top + 64 }]} {...gestoAbrir.panHandlers} /> : null}

      {visible && user ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[s.fondo, { opacity: opacidadFondo }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} accessibilityLabel="Cerrar menú" />
          </Animated.View>

          <Animated.View
            {...gestoCerrar.panHandlers}
            style={[s.panel, { width: ancho, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 16, transform: [{ translateX: x }] }]}
            accessibilityViewIsModal
          >
            {/* Encabezado: marca + búsqueda */}
            <View style={s.encabezado}>
              {buscando ? (
                <View style={s.buscador}>
                  <Ico name="search" size={18} color={colors.sub} />
                  <TextInput
                    value={busqueda}
                    onChangeText={setBusqueda}
                    placeholder="Buscar módulo"
                    placeholderTextColor={colors.faint}
                    style={s.buscadorTexto}
                    autoFocus
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  <Pressable onPress={() => { setBuscando(false); setBusqueda(''); }} hitSlop={10} accessibilityLabel="Cerrar búsqueda">
                    <Ico name="close" size={20} color={colors.sub} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={s.marca} accessibilityRole="header">
                    Health<Text style={s.marcaAcento}>Nexus</Text>
                  </Text>
                  <Pressable onPress={() => setBuscando(true)} hitSlop={12} accessibilityLabel="Buscar módulo" style={s.botonBuscar}>
                    <Ico name="search-outline" size={24} color={colors.text} />
                  </Pressable>
                </>
              )}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.lista} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {!busqueda ? <Item {...INICIO} /> : null}

              {secciones.map((sec) => (
                <View key={sec.id}>
                  <View style={s.separador} />
                  <Text style={s.seccion}>{sec.titulo}</Text>
                  {sec.modulos.map((m) => <Item key={m.id} {...m} />)}
                </View>
              ))}

              {busqueda && secciones.length === 0 ? (
                <Text style={s.sinResultados}>No hay módulos que coincidan con “{busqueda}”.</Text>
              ) : null}
            </ScrollView>

            {/* Pie: usuario + cerrar sesión */}
            <View style={s.pie}>
              <View style={s.usuario} accessible accessibilityLabel={`${user.nombre}, ${ROL[user.rol] || user.rol}`}>
                <View style={s.avatar}>
                  <Text style={s.avatarTexto}>{inicial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.usuarioNombre} numberOfLines={1}>{user.nombre}</Text>
                  <Text style={s.usuarioRol} numberOfLines={1}>{ROL[user.rol] || user.rol}</Text>
                </View>
              </View>
              <Pressable onPress={confirmarSalida} style={({ pressed }) => [s.salir, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
                <Ico name="log-out-outline" size={18} color={colors.text} />
                <Text style={s.salirTexto}>Salir</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </MenuContext.Provider>
  );
}

const s = StyleSheet.create({
  borde: { position: 'absolute', left: 0, bottom: 0, width: BORDE },
  fondo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16, 42, 106, 0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#fff',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, minHeight: 56, marginBottom: 14 },
  marca: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  marcaAcento: { color: colors.tealDeep },
  botonBuscar: { padding: 4 },
  buscador: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bg, borderRadius: 14, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: colors.line },
  buscadorTexto: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  lista: { paddingHorizontal: 12, paddingBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, height: 52, borderRadius: 14 },
  itemActivo: { backgroundColor: colors.mint },
  itemPresionado: { backgroundColor: colors.bg },
  itemTexto: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.text },
  itemTextoActivo: { fontWeight: '700', color: colors.tealDeep },
  separador: { height: 1, backgroundColor: colors.line, marginHorizontal: 10, marginVertical: 10 },
  seccion: { fontSize: 14, fontWeight: '600', color: colors.sub, paddingHorizontal: 14, marginBottom: 6, marginTop: 4 },
  sinResultados: { textAlign: 'center', color: colors.sub, marginTop: 30, paddingHorizontal: 20 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  usuario: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: '#fff', fontWeight: '800', fontSize: 17 },
  usuarioNombre: { fontSize: 14, fontWeight: '700', color: colors.text },
  usuarioRol: { fontSize: 12, color: colors.sub, marginTop: 1 },
  salir: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line },
  salirTexto: { fontSize: 15, fontWeight: '700', color: colors.text },
});
