import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export const MENSAJES_GPS = {
  denegado: 'Permiso de ubicación denegado. Actívalo en Ajustes para ordenar por cercanía.',
  sin_gps: 'No se pudo obtener la ubicación (GPS apagado o sin señal).',
};

// Devuelve { pos: {lat,lng} | null, motivo: null | 'denegado' | 'sin_gps' }
export async function getPositionDetail({ timeout = 8000 } = {}) {
  try {
    if (Platform.OS === 'android') {
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (r !== PermissionsAndroid.RESULTS.GRANTED) return { pos: null, motivo: 'denegado' };
    }
    return await new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (p) => resolve({ pos: { lat: p.coords.latitude, lng: p.coords.longitude }, motivo: null }),
        () => resolve({ pos: null, motivo: 'sin_gps' }),
        { timeout, enableHighAccuracy: false, maximumAge: 60000 },
      );
    });
  } catch {
    return { pos: null, motivo: 'sin_gps' };
  }
}

// Devuelve { lat, lng } o null si no hay permiso o falla el GPS
export async function getPosition() {
  return (await getPositionDetail()).pos;
}
