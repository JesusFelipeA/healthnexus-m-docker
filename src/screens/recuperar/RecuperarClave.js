// Paso 3 de 3: contraseña nueva con los requisitos visibles mientras se escribe.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { restablecerClave } from '../../api';
import { Button, ErrorBox, Field, Ico, conTema } from '../../components/ui';
import { LIMITES } from '../../utils/validation';
import { MENSAJES_RECUPERACION, bytesUtf8, claveValida, mensajeRecuperacion, reglasClave } from '../../utils/recuperacion';
import { Paso } from './Paso';

export default function RecuperarClave({ navigation, route }) {
  const s = estilos();
  const resetToken = route && route.params && route.params.resetToken;
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const reglas = reglasClave(nueva, confirmar);
  const valida = claveValida(nueva, confirmar);

  const guardar = async () => {
    if (guardando) return;
    if (bytesUtf8(nueva) > 72) { setError(MENSAJES_RECUPERACION.claveLarga); return; }
    if (!valida) { setError(MENSAJES_RECUPERACION.claveDebil); return; }
    setGuardando(true);
    setError('');
    try {
      await restablecerClave(resetToken, nueva);
      // "Atrás" desde la pantalla final regresa al inicio de sesión, no a este formulario
      navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'RecuperarListo' }] });
    } catch (e) {
      const { mensaje, reiniciar } = mensajeRecuperacion(e, 'clave');
      if (reiniciar) {
        navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'RecuperarCorreo', params: { aviso: mensaje } }] });
      } else {
        setError(mensaje);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Paso
      paso={3}
      titulo="Crea una contraseña nueva"
      descripcion="Úsala para entrar en la app y en la plataforma web."
      onVolver={() => navigation.goBack()}
      etiquetaVolver="Volver al código"
    >
      <View>
        <Field
          label="Contraseña nueva"
          icon="lock-closed-outline"
          value={nueva}
          onChangeText={(t) => { setNueva(t); if (error) setError(''); }}
          placeholder="Escribe tu contraseña"
          password
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password-new"
          textContentType="newPassword"
          maxLength={LIMITES.passwordMax}
          autoFocus
        />
        <Field
          label="Confirma la contraseña"
          icon="lock-closed-outline"
          value={confirmar}
          onChangeText={(t) => { setConfirmar(t); if (error) setError(''); }}
          placeholder="Repite la contraseña"
          password
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password-new"
          textContentType="newPassword"
          maxLength={LIMITES.passwordMax}
          onSubmitEditing={guardar}
        />
      </View>

      <View style={s.reglas} accessibilityLabel="Requisitos de la contraseña">
        {reglas.map((r) => (
          <View key={r.id} style={s.regla} accessible accessibilityLabel={`${r.texto}, ${r.ok ? 'cumplido' : 'pendiente'}`}>
            <View style={[s.marca, r.ok ? s.marcaOk : s.marcaPendiente]}>
              <Ico name={r.ok ? 'checkmark' : 'ellipse'} size={r.ok ? 13 : 6} color={r.ok ? s.textoOk.color : s.textoPendiente.color} />
            </View>
            <Text style={[s.reglaTexto, r.ok ? s.textoOk : s.textoPendiente]}>{r.texto}</Text>
          </View>
        ))}
      </View>

      <ErrorBox message={error} />
      <Button title="Guardar contraseña" icon="save-outline" onPress={guardar} loading={guardando} disabled={!valida} />
      <Text style={s.nota}>Al guardarla, cerraremos tu sesión en los demás dispositivos.</Text>
    </Paso>
  );
}

const estilos = conTema((c) => StyleSheet.create({
  reglas: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 14, gap: 10, marginTop: -6 },
  regla: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  marca: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  marcaOk: { backgroundColor: c.successTint },
  marcaPendiente: { backgroundColor: c.surfaceAlt },
  reglaTexto: { fontSize: 14 },
  textoOk: { color: c.success },
  textoPendiente: { color: c.sub },
  nota: { fontSize: 13, lineHeight: 19, color: c.faint, textAlign: 'center', marginTop: -8 },
}));
