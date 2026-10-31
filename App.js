import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import EmergencyButton from './src/components/EmergencyButton';
import { MenuProvider } from './src/navigation/MenuLateral';
import { colors } from './src/components/ui';
import { TemaProvider, useTema } from './src/theme/TemaContext';
import { iniciarPush } from './src/services/push';
import Login from './src/screens/Login';
import RecuperarCorreo from './src/screens/recuperar/RecuperarCorreo';
import RecuperarCodigo from './src/screens/recuperar/RecuperarCodigo';
import RecuperarClave from './src/screens/recuperar/RecuperarClave';
import RecuperarListo from './src/screens/recuperar/RecuperarListo';
import Dashboard from './src/screens/Dashboard';
import Triage from './src/screens/Triage';
import Patients from './src/screens/Patients';
import NuevoPaciente from './src/screens/NuevoPaciente';
import Internas from './src/screens/Internas';
import Externas from './src/screens/Externas';
import Hospitals from './src/screens/Hospitals';
import Seguimiento from './src/screens/Seguimiento';
import Auditoria from './src/screens/Auditoria';
import Cuentas from './src/screens/Cuentas';
import CuentaDetalle from './src/screens/CuentaDetalle';
import SignosVitales from './src/screens/SignosVitales';
import Medicacion from './src/screens/Medicacion';
import Medicamentos from './src/screens/Medicamentos';
import Existencias from './src/screens/Existencias';
import Movimientos from './src/screens/Movimientos';
import AlertasFarmacia from './src/screens/AlertasFarmacia';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// Las pantallas disponibles dependen del rol (la API vuelve a validar los permisos)
function Routes() {
  const { user, loading, can } = useAuth();
  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.teal} size="large" /></View>;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={Login} />
          {/* Recuperar contraseña con un código de 6 dígitos por correo */}
          <Stack.Screen name="RecuperarCorreo" component={RecuperarCorreo} />
          <Stack.Screen name="RecuperarCodigo" component={RecuperarCodigo} />
          <Stack.Screen name="RecuperarClave" component={RecuperarClave} />
          <Stack.Screen name="RecuperarListo" component={RecuperarListo} />
        </>
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={Dashboard} />
          {can('medico', 'enfermeria') && (
            <>
              <Stack.Screen name="Triage" component={Triage} />
              <Stack.Screen name="Patients" component={Patients} />
              <Stack.Screen name="NuevoPaciente" component={NuevoPaciente} />
              <Stack.Screen name="Internas" component={Internas} />
              <Stack.Screen name="Hospitals" component={Hospitals} />
              <Stack.Screen name="Seguimiento" component={Seguimiento} />
            </>
          )}
          {can('medico') && <Stack.Screen name="Externas" component={Externas} />}
          {can('enfermeria', 'medico') && (
            <>
              <Stack.Screen name="SignosVitales" component={SignosVitales} />
              <Stack.Screen name="Medicacion" component={Medicacion} />
            </>
          )}
          {can('farmacia', 'enfermeria', 'medico') && <Stack.Screen name="Existencias" component={Existencias} />}
          {can('farmacia', 'enfermeria') && <Stack.Screen name="Movimientos" component={Movimientos} />}
          {can('farmacia') && (
            <>
              <Stack.Screen name="Medicamentos" component={Medicamentos} />
              <Stack.Screen name="AlertasFarmacia" component={AlertasFarmacia} />
            </>
          )}
          {can() && (
            <>
              <Stack.Screen name="Cuentas" component={Cuentas} />
              <Stack.Screen name="CuentaDetalle" component={CuentaDetalle} />
              <Stack.Screen name="Auditoria" component={Auditoria} />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

// Activa las notificaciones push cuando hay sesión; al tocar una, abre la pantalla indicada.
function NotificacionesPush() {
  const { user } = useAuth();
  const userId = user ? user.id : null;
  useEffect(() => {
    if (!userId) return;
    iniciarPush((pantalla) => {
      if (navigationRef.isReady()) navigationRef.navigate(pantalla);
    });
  }, [userId]);
  return null;
}

// Al cambiar de tema se vuelven a montar las pantallas (para que tomen la paleta nueva),
// conservando la pantalla en la que estaba el usuario.
function Contenido() {
  const { modo } = useTema();
  const [rutaActual, setRutaActual] = useState(null);
  const estadoNav = useRef(undefined);
  const actualizarRuta = () => {
    setRutaActual(navigationRef.getCurrentRoute()?.name ?? null);
    if (navigationRef.isReady()) estadoNav.current = navigationRef.getRootState();
  };

  return (
    <>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* La barra lateral se dibuja encima de las pantallas y del botón de emergencia */}
        <MenuProvider navigationRef={navigationRef} rutaActual={rutaActual}>
          <React.Fragment key={modo}>
            <NavigationContainer ref={navigationRef} initialState={estadoNav.current} onReady={actualizarRuta} onStateChange={actualizarRuta}>
              <Routes />
            </NavigationContainer>
            <EmergencyButton />
          </React.Fragment>
          <NotificacionesPush />
        </MenuProvider>
      </View>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <AuthProvider>
          <Contenido />
        </AuthProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
