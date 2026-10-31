// Inicio (diseño de la maqueta): saludo según la hora, emergencias activas, resumen del turno
// en mosaicos y accesos rápidos según el rol. Deslizar hacia abajo actualiza los datos.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Navegacion from '@react-navigation/native';
import { getFarmaciaResumen, getStats } from '../api';
import { useAuth } from '../context/AuthContext';
import useFetch from '../hooks/useFetch';
import { BotonMenu, ErrorBox, Ico, colors, conTema } from '../components/ui';
import EmergenciasActivas from '../components/EmergenciasActivas';
import { useMenu } from '../navigation/menuContext';
import { MODULOS } from '../navigation/modulos';
import { insigniaTriage } from '../theme/paletas';
import { fechaCorta, horaMinutos, iniciales, primerNombre, saludo } from '../utils/fecha';

const ROL = { administrador: 'Administrador', medico: 'Médico', enfermeria: 'Enfermería', farmacia: 'Farmacia' };

// Orden de preferencia de los accesos rápidos: se muestran los 4 primeros que el rol puede abrir
const PREFERIDOS = ['Patients', 'Triage', 'SignosVitales', 'Medicacion', 'Existencias', 'Movimientos', 'Medicamentos', 'AlertasFarmacia', 'Cuentas', 'Auditoria'];

export function accesosRapidos(can) {
  return PREFERIDOS.map((id) => MODULOS.find((m) => m.id === id)).filter((m) => m && can(...m.roles)).slice(0, 4);
}

function Mosaico({ etiqueta, valor, nota, punto }) {
  const s = estilos();
  return (
    <View style={s.mosaico} accessible accessibilityLabel={`${etiqueta}: ${valor}${nota ? `, ${nota}` : ''}`}>
      <View style={s.mosaicoFila}>
        {punto ? <View style={[s.punto, { backgroundColor: punto }]} /> : null}
        <Text style={s.mosaicoEtiqueta} numberOfLines={1}>{etiqueta}</Text>
      </View>
      <Text style={s.mosaicoValor}>{valor}</Text>
      {nota ? <Text style={s.mosaicoNota} numberOfLines={1}>{nota}</Text> : null}
    </View>
  );
}

export default function Dashboard() {
  const s = estilos();
  const { user, can } = useAuth();
  const menu = useMenu();
  const navigation = Navegacion.useNavigation();
  const isFarmacia = user?.rol === 'farmacia';

  const { data, error, reload } = useFetch(() => (isFarmacia ? getFarmaciaResumen() : getStats()), []);
  const [actualizado, setActualizado] = useState(null);
  const [refrescando, setRefrescando] = useState(false);
  useEffect(() => { if (data) setActualizado(new Date()); }, [data]);

  const refrescar = async () => {
    setRefrescando(true);
    try { await reload(true); } finally { setRefrescando(false); }
  };

  const abrir = (id) => {
    if (menu && menu.irA) menu.irA(id);
    else if (navigation) navigation.navigate(id);
  };

  const ahora = new Date();
  const stats = data || {};
  const n = (v) => (typeof v === 'number' ? v : data ? 0 : '—');
  const puedeVer = typeof can === 'function' ? can : () => false;
  const accesos = accesosRapidos(puedeVer);

  const total = isFarmacia
    ? { etiqueta: 'Medicamentos activos', valor: n(stats.totalMedicamentos), icono: 'medical-outline', destino: 'Medicamentos' }
    : { etiqueta: 'Pacientes registrados', valor: n(stats.totalPatients), icono: 'people-outline', destino: 'Patients' };
  const mosaicos = isFarmacia
    ? [
        { etiqueta: 'Stock bajo', valor: n(stats.stockBajo), nota: 'Revisar', punto: colors.warning },
        { etiqueta: 'Sin stock', valor: n(stats.sinStock), nota: 'Reponer', punto: colors.danger },
        { etiqueta: 'Por caducar', valor: n(stats.lotesPorCaducar), nota: `${n(stats.lotesCaducados)} vencidos`, punto: insigniaTriage('naranja').dot },
      ]
    : [
        { etiqueta: 'Crítico', valor: n(stats.redCount), nota: 'Nivel I', punto: insigniaTriage('rojo').dot },
        { etiqueta: 'Urgente', valor: n(stats.yellowCount), nota: 'Nivel III', punto: insigniaTriage('amarillo').dot },
        { etiqueta: 'Leve', valor: n(stats.greenCount), nota: 'Nivel IV', punto: insigniaTriage('verde').dot },
      ];
  const puedeAbrirTotal = MODULOS.some((m) => m.id === total.destino && puedeVer(...m.roles));

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colors.teal]} tintColor={colors.teal} progressBackgroundColor={colors.surface} />}
      >
        {/* Encabezado: menú, marca y perfil */}
        <View style={s.topBar}>
          <BotonMenu style={s.cuadro} />
          <View style={s.marca}>
            <Image source={require('../img/simbolo-healthnexus.png')} style={s.simbolo} resizeMode="contain" />
            <Text style={s.marcaTexto}>Health<Text style={s.marcaAcento}>Nexus</Text></Text>
          </View>
          <Pressable
            style={s.perfil}
            onPress={menu ? menu.abrir : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Perfil de ${user?.nombre || 'usuario'}`}
          >
            <Text style={s.perfilTexto}>{iniciales(user?.nombre)}</Text>
          </Pressable>
        </View>

        {/* Saludo */}
        <View style={s.saludo}>
          <Text style={s.saludoTitulo} accessibilityRole="header">{saludo(ahora)}, {primerNombre(user?.nombre)}</Text>
          <View style={s.saludoFila}>
            <Text style={s.saludoRol}>{ROL[user?.rol] || user?.rol}</Text>
            <Text style={s.fecha}>{fechaCorta(ahora)}</Text>
          </View>
          <View style={s.enLinea}>
            <View style={[s.punto, { backgroundColor: error ? colors.warning : colors.green }]} />
            <Text style={[s.enLineaTexto, error && { color: colors.warning }]}>
              {error ? 'Sin actualizar' : `En línea${actualizado ? ` · actualizado ${horaMinutos(actualizado)}` : ''}`}
            </Text>
          </View>
        </View>

        {/* Emergencias activas: solo aparece si hay alguna abierta */}
        {!isFarmacia && <EmergenciasActivas />}

        {/* Resumen */}
        <View style={s.seccion}>
          <View style={s.seccionFila}>
            <Text style={s.seccionTitulo}>{isFarmacia ? 'Resumen de farmacia' : 'Resumen del turno'}</Text>
            {puedeAbrirTotal ? (
              <Pressable onPress={() => abrir(total.destino)} hitSlop={10} style={s.verTodo} accessibilityRole="link" accessibilityLabel={isFarmacia ? 'Ver medicamentos' : 'Ver pacientes'}>
                <Text style={s.verTodoTexto}>{isFarmacia ? 'Ver medicamentos' : 'Ver pacientes'}</Text>
                <Ico name="chevron-forward" size={16} color={colors.tealDeep} />
              </Pressable>
            ) : null}
          </View>

          <ErrorBox message={error} onRetry={reload} />

          <View style={s.total} accessible accessibilityLabel={`${total.etiqueta}: ${total.valor}`}>
            <View style={s.totalIcono}><Ico name={total.icono} size={20} color={colors.teal} /></View>
            <Text style={s.totalEtiqueta}>{total.etiqueta}</Text>
            <Text style={s.totalValor}>{total.valor}</Text>
          </View>
          <View style={s.mosaicos}>
            {mosaicos.map((m) => <Mosaico key={m.etiqueta} {...m} />)}
          </View>
        </View>

        {/* Accesos rápidos */}
        {accesos.length ? (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Accesos rápidos</Text>
            <View style={s.accesos}>
              {accesos.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => abrir(m.id)}
                  style={({ pressed }) => [s.acceso, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityLabel={m.title}
                >
                  <View style={s.accesoIcono}><Ico name={m.icon} size={20} color={colors.teal} /></View>
                  <Text style={s.accesoTexto} numberOfLines={2}>{m.title}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = conTema((c) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  // paddingBottom deja libre el botón de emergencia flotante
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 22 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 52 },
  cuadro: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
  marca: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  simbolo: { width: 30, height: 29 },
  marcaTexto: { fontSize: 18, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  marcaAcento: { color: c.teal },
  perfil: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  perfilTexto: { fontSize: 15, fontWeight: '700', color: c.tealDeep },
  saludo: { gap: 6 },
  saludoTitulo: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  saludoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  saludoRol: { flex: 1, fontSize: 14, color: c.sub },
  fecha: { fontSize: 13, fontWeight: '600', color: c.label, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
  enLinea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  enLineaTexto: { fontSize: 13, color: c.online, fontWeight: '600' },
  punto: { width: 8, height: 8, borderRadius: 4 },
  seccion: { gap: 12 },
  seccionFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seccionTitulo: { fontSize: 17, fontWeight: '700', color: c.text },
  verTodo: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  verTodoTexto: { fontSize: 13, fontWeight: '600', color: c.tealDeep },
  total: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14 },
  totalIcono: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  totalEtiqueta: { flex: 1, fontSize: 14, color: c.sub },
  totalValor: { fontSize: 26, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
  mosaicos: { flexDirection: 'row', gap: 10 },
  mosaico: { flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, padding: 12, gap: 4 },
  mosaicoFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mosaicoEtiqueta: { flex: 1, fontSize: 12, fontWeight: '600', color: c.label },
  mosaicoValor: { fontSize: 26, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
  mosaicoNota: { fontSize: 12, color: c.faint },
  accesos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  acceso: { flexGrow: 1, flexBasis: '45%', height: 64, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 12 },
  accesoIcono: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  accesoTexto: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text },
}));
