// Paso 1 de 3: el usuario escribe su correo y la API le envía un código de 6 dígitos.
import React, { useState } from 'react';
import { Text } from 'react-native';
import { recuperarClave } from '../../api';
import { Button, ErrorBox, Field, colors } from '../../components/ui';
import { LIMITES } from '../../utils/validation';
import { MENSAJES_RECUPERACION, correoValido, mensajeRecuperacion, normalizarCorreo } from '../../utils/recuperacion';
import { Nota, Paso } from './Paso';

export default function RecuperarCorreo({ navigation, route }) {
  const [email, setEmail] = useState((route && route.params && route.params.email) || '');
  const [error, setError] = useState((route && route.params && route.params.aviso) || '');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    if (!correoValido(email)) {
      setError(MENSAJES_RECUPERACION.correoInvalido);
      return;
    }
    const correo = normalizarCorreo(email);
    setEnviando(true);
    setError('');
    try {
      // La API responde igual exista o no la cuenta: siempre se pasa al siguiente paso.
      await recuperarClave(correo);
      navigation.navigate('RecuperarCodigo', { email: correo });
    } catch (e) {
      setError(mensajeRecuperacion(e, 'correo').mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Paso
      paso={1}
      icono="lock-open-outline"
      titulo="Recupera tu contraseña"
      descripcion="Escribe el correo de tu cuenta institucional. Te enviaremos un código de 6 dígitos para crear una contraseña nueva."
      onVolver={() => navigation.goBack()}
      etiquetaVolver="Volver a iniciar sesión"
      pie={(
        <Text style={{ textAlign: 'center', fontSize: 13, lineHeight: 19, color: colors.faint }}>
          ¿No tienes acceso a tu correo?{'\n'}Contacta al área de Sistemas del hospital.
        </Text>
      )}
    >
      <Field
        label="Correo electrónico"
        icon="mail-outline"
        value={email}
        onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
        placeholder="usuario@hospital.mx"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={LIMITES.emailMax}
        returnKeyType="send"
        onSubmitEditing={enviar}
        autoFocus={!email}
      />
      <ErrorBox message={error} />
      <Button title="Enviar código" icon="paper-plane-outline" onPress={enviar} loading={enviando} style={{ marginTop: -4 }} />

      <Nota>
        <Text style={{ fontWeight: '700', color: colors.label }}>¿Eres médico y olvidaste tu PIN? </Text>
        El PIN no se recupera por correo: pide al administrador que lo regenere desde la plataforma web.
      </Nota>
    </Paso>
  );
}
