// Paso 2 de 3: el código de 6 dígitos que llegó por correo. Se puede pedir otro después de 60 s.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { recuperarClave, verificarCodigo } from '../../api';
import { Button, ErrorBox, Toast, colors, conTema } from '../../components/ui';
import {
  CODIGO_LONGITUD,
  MENSAJES_RECUPERACION,
  MINUTOS_CODIGO,
  SEGUNDOS_REENVIO,
  enmascararCorreo,
  formatoCuenta,
  mensajeRecuperacion,
  soloDigitos,
} from '../../utils/recuperacion';
import { Paso } from './Paso';

export default function RecuperarCodigo({ navigation, route }) {
  const s = estilos();
  const email = (route && route.params && route.params.email) || '';
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [segundos, setSegundos] = useState(SEGUNDOS_REENVIO);
  const campo = useRef(null);

  // Cuenta regresiva para "Reenviar código"
  useEffect(() => {
    if (segundos <= 0) return undefined;
    const t = setTimeout(() => setSegundos((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  const verificar = async (valor = codigo) => {
    if (verificando) return;
    if (valor.length !== CODIGO_LONGITUD) {
      setError(MENSAJES_RECUPERACION.codigoIncompleto);
      return;
    }
    setVerificando(true);
    setError('');
    try {
      const r = await verificarCodigo(email, valor);
      navigation.navigate('RecuperarClave', { resetToken: r.resetToken });
    } catch (e) {
      const { mensaje, bloqueado } = mensajeRecuperacion(e, 'codigo');
      setCodigo('');
      setError(mensaje);
      if (bloqueado) setSegundos(0); // puede pedir otro de inmediato
    } finally {
      setVerificando(false);
    }
  };

  const escribir = (texto) => {
    const limpio = soloDigitos(texto);
    setCodigo(limpio);
    if (error) setError('');
    // Al completar los 6 dígitos (o pegar el código) se verifica solo
    if (limpio.length === CODIGO_LONGITUD) verificar(limpio);
  };

  const reenviar = async () => {
    if (reenviando || segundos > 0) return;
    setReenviando(true);
    setError('');
    try {
      await recuperarClave(email);
      setCodigo('');
      setSegundos(SEGUNDOS_REENVIO);
      setAviso('Te enviamos un código nuevo. El anterior ya no sirve.');
    } catch (e) {
      setError(mensajeRecuperacion(e, 'correo').mensaje);
    } finally {
      setReenviando(false);
    }
  };

  const activa = Math.min(codigo.length, CODIGO_LONGITUD - 1);

  return (
    <View style={{ flex: 1 }}>
      <Paso
        paso={2}
        icono="mail-unread-outline"
        titulo="Revisa tu correo"
        descripcion={`Si ${enmascararCorreo(email) || 'tu correo'} tiene una cuenta activa, te enviamos un código. Vence en ${MINUTOS_CODIGO} minutos.`}
        onVolver={() => navigation.goBack()}
        etiquetaVolver="Volver a escribir el correo"
      >
        <View>
          <Text style={s.etiqueta}>Código de 6 dígitos</Text>
          <Pressable onPress={() => campo.current && campo.current.focus()} accessibilityRole="none" importantForAccessibility="no-hide-descendants">
            <View style={s.casillas}>
              {Array.from({ length: CODIGO_LONGITUD }, (_, i) => (
                <View key={i} style={[s.casilla, codigo[i] && s.casillaLlena, i === activa && codigo.length < CODIGO_LONGITUD && s.casillaActiva]}>
                  <Text style={s.digito}>{codigo[i] || ''}</Text>
                </View>
              ))}
            </View>
          </Pressable>
          {/* Campo real (invisible) encima de las casillas: permite escribir, pegar y autocompletar el código */}
          <TextInput
            ref={campo}
            value={codigo}
            onChangeText={escribir}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={CODIGO_LONGITUD}
            autoFocus
            caretHidden
            accessibilityLabel="Código de 6 dígitos"
            style={s.oculto}
          />
          <Text style={s.ayuda}>Toca las casillas para escribir. También puedes pegar el código.</Text>
        </View>

        <ErrorBox message={error} />
        <Button title="Verificar código" icon="shield-checkmark-outline" onPress={() => verificar()} loading={verificando} disabled={codigo.length !== CODIGO_LONGITUD} />

        <View style={s.reenvio}>
          {segundos > 0 ? (
            <Text style={s.ayudaCentro}>¿No llegó? Podrás pedir otro en <Text style={s.cuenta}>{formatoCuenta(segundos)}</Text></Text>
          ) : (
            <Pressable onPress={reenviar} disabled={reenviando} style={s.botonReenviar} accessibilityRole="button" accessibilityLabel="Reenviar código">
              <Text style={s.reenviarTexto}>{reenviando ? 'Enviando...' : 'Reenviar código'}</Text>
            </Pressable>
          )}
          <Text style={s.ayudaCentro}>Revisa también la carpeta de correo no deseado.</Text>
        </View>
      </Paso>
      <Toast message={aviso} onHide={() => setAviso('')} />
    </View>
  );
}

const estilos = conTema((c) => StyleSheet.create({
  etiqueta: { fontSize: 13, fontWeight: '600', color: c.label, marginBottom: 8 },
  casillas: { flexDirection: 'row', gap: 8 },
  casilla: { flex: 1, height: 56, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.inputBorder, alignItems: 'center', justifyContent: 'center' },
  casillaLlena: { borderColor: c.modo === 'oscuro' ? '#4A5680' : '#B9C0D2' },
  casillaActiva: { borderWidth: 2, borderColor: c.teal },
  digito: { fontSize: 24, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
  oculto: { position: 'absolute', top: 24, left: 0, right: 0, height: 56, opacity: 0.02, color: 'transparent' },
  ayuda: { fontSize: 12, color: c.faint, marginTop: 8 },
  reenvio: { alignItems: 'center', gap: 6 },
  ayudaCentro: { fontSize: 14, color: c.sub, textAlign: 'center' },
  cuenta: { fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
  botonReenviar: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  reenviarTexto: { fontSize: 14, fontWeight: '700', color: colors.tealDeep },
}));
