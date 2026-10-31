// Inicio de sesión (diseño de la maqueta): logo, tarjeta con correo y contraseña, enlace
// "¿La olvidaste?" al flujo de recuperación y, para médicos, el segundo paso con el PIN.
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { version as APP_VERSION } from '../../package.json';
import { AMBIENTE } from '../config';
import { Button, ErrorBox, Field, Ico, colors, conTema } from '../components/ui';
import { LIMITES, PIN_LONGITUD, validarLogin, validarPin } from '../utils/validation';
import { mensajeLogin, mensajePin } from '../utils/errors';

export default function Login() {
  const s = estilos();
  const { login, verificarPin } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Segundo paso (solo médico): el pinToken dura 5 minutos en la API
  const [pinToken, setPinToken] = useState(null);
  const [pin, setPin] = useState('');

  // Entrada suave de la tarjeta
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrada, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [entrada]);
  const estiloEntrada = {
    opacity: entrada,
    transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  const submit = async () => {
    const v = validarLogin({ email, password });
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await login(v.valores.email, v.valores.password);
      if (r && r.requierePin) {
        setPin('');
        setPinToken(r.pinToken);
      }
    } catch (e) {
      setPassword('');
      setError(mensajeLogin(e));
    } finally {
      setLoading(false);
    }
  };

  const volverACredenciales = (mensaje = '') => {
    setPinToken(null);
    setPin('');
    setPassword('');
    setError(mensaje);
  };

  const submitPin = async () => {
    const v = validarPin(pin);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verificarPin(pinToken, v.valor);
    } catch (e) {
      const { mensaje, expirado } = mensajePin(e);
      if (expirado) {
        volverACredenciales(mensaje);
      } else {
        setPin('');
        setError(mensaje);
      }
    } finally {
      setLoading(false);
    }
  };

  const recuperar = () => {
    setError('');
    navigation.navigate('RecuperarCorreo', { email: email.trim() });
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Marca: símbolo + nombre (el texto cambia de color con el tema) */}
        <View style={s.marca} accessible accessibilityRole="header" accessibilityLabel="HealthNexus, tecnología que cuida vidas">
          <Image source={require('../img/simbolo-healthnexus.png')} style={s.simbolo} resizeMode="contain" />
          <Text style={s.nombre}>
            Health<Text style={s.nombreAcento}>Nexus</Text>
          </Text>
          <Text style={s.lema}>Tecnología que cuida vidas</Text>
        </View>

        <Animated.View style={[s.card, estiloEntrada]}>
          <View style={{ gap: 6, marginBottom: 20 }}>
            <Text style={s.title}>{pinToken ? 'Verificación de seguridad' : 'Inicia sesión'}</Text>
            <Text style={s.description}>
              {pinToken ? 'Escribe tu PIN de 4 dígitos para continuar.' : 'Usa tu cuenta institucional del hospital.'}
            </Text>
          </View>

          {pinToken ? (
            <Field
              label="PIN de seguridad"
              icon="keypad-outline"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, PIN_LONGITUD))}
              placeholder="••••"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={PIN_LONGITUD}
              autoFocus
              textContentType="oneTimeCode"
              accessibilityLabel="PIN de seguridad"
              onSubmitEditing={submitPin}
            />
          ) : (
            <>
              <Field
                label="Correo electrónico"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="usuario@hospital.mx"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                maxLength={LIMITES.emailMax}
              />
              <View style={s.claveFila}>
                <Text style={s.claveEtiqueta}>Contraseña</Text>
                <Pressable onPress={recuperar} hitSlop={10} style={s.enlace} accessibilityRole="link" accessibilityLabel="¿Olvidaste tu contraseña?">
                  <Text style={s.enlaceTexto}>¿La olvidaste?</Text>
                </Pressable>
              </View>
              <Field
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                password
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
                maxLength={LIMITES.passwordMax}
                accessibilityLabel="Contraseña"
                onSubmitEditing={submit}
              />
            </>
          )}

          <ErrorBox message={error} />

          {pinToken ? (
            <>
              <Button title="Verificar PIN" icon="shield-checkmark-outline" onPress={submitPin} loading={loading} />
              <Pressable onPress={() => volverACredenciales()} style={s.otraCuenta} accessibilityRole="button" accessibilityLabel="Usar otra cuenta">
                <Text style={s.enlaceTexto}>Usar otra cuenta</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Button title="Iniciar sesión" icon="log-in-outline" onPress={submit} loading={loading} />
              <View style={s.aviso}>
                <Ico name="shield-checkmark-outline" size={18} color={colors.teal} />
                <Text style={s.avisoTexto}>Si eres médico, después te pediremos tu PIN de 4 dígitos.</Text>
              </View>
            </>
          )}
        </Animated.View>

        <View style={{ flexGrow: 1 }} />

        <View style={s.pie}>
          <Ico name="lock-closed-outline" size={14} color={colors.faint} />
          <Text style={s.version}>
            Conexión cifrada · v{APP_VERSION}
            {AMBIENTE !== 'prod' ? ` · ${AMBIENTE.toUpperCase()}` : ''}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = conTema((c) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, gap: 28 },
  marca: { alignItems: 'center' },
  simbolo: { width: 72, height: 70 },
  nombre: { fontSize: 30, fontWeight: '800', color: c.modo === 'oscuro' ? c.text : '#1B2160', letterSpacing: -0.8, marginTop: 10 },
  nombreAcento: { color: c.modo === 'oscuro' ? c.teal : '#6A3FE0' },
  lema: { fontSize: 13, color: c.sub, letterSpacing: 0.6, marginTop: 2 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  description: { fontSize: 14, lineHeight: 20, color: c.sub },
  claveFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  claveEtiqueta: { fontSize: 13, fontWeight: '600', color: c.label },
  enlace: { minHeight: 28, justifyContent: 'center' },
  enlaceTexto: { fontSize: 13, fontWeight: '700', color: c.tealDeep },
  otraCuenta: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 8 },
  aviso: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: c.mint, borderRadius: 12, padding: 12, marginTop: 16 },
  avisoTexto: { flex: 1, fontSize: 13, lineHeight: 19, color: c.tealDeep },
  pie: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  version: { fontSize: 12, color: c.faint },
}));
