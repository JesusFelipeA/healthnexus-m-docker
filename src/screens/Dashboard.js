import React, { useEffect, useRef } from 'react';

import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { getFarmaciaResumen, getStats } from '../api';

import { useAuth } from '../context/AuthContext';

import useFetch from '../hooks/useFetch';

import {
  BotonMenu,
  Ico,
  ErrorBox,
  colors,
  shadow,
} from '../components/ui';
import { useMenu } from '../navigation/menuContext';

const ROL = {
  administrador: 'Administrador',
  medico: 'Médico',
  enfermeria: 'Enfermería',
  farmacia: 'Farmacia',
};

function StatRow({ row, index, isLast }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: 600 + index * 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  const animatedStyle = {
    opacity: anim,
    transform: [
      {
        translateX: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={[
        s.statRow,
        isLast && { borderBottomWidth: 0 },
        animatedStyle,
      ]}
    >
      <View style={[s.statIcon, { backgroundColor: row.bg }]}>
        <Ico name={row.icon} size={19} color={row.color} />
      </View>

      <View style={s.statInfo}>
        <Text style={s.statLabel}>{row.label}</Text>
        <Text style={s.statValue}>{row.value}</Text>
      </View>

      <View style={[s.chip, { backgroundColor: row.bg }]}>
        <Text style={[s.chipText, { color: row.color }]}>
          {row.chip}
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function Dashboard() {
  const { user } = useAuth();
  const menu = useMenu();

  const isFarmacia = user?.rol === 'farmacia';

  const { data, error, reload } = useFetch(
    () => (isFarmacia ? getFarmaciaResumen() : getStats()),
    []
  );

  const stats = data || {
    totalPatients: 0,
    redCount: 0,
    yellowCount: 0,
    greenCount: 0,
  };

  const farm = data || {
    totalMedicamentos: 0,
    stockBajo: 0,
    sinStock: 0,
    lotesPorCaducar: 0,
    lotesCaducados: 0,
  };

  const date = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  /* ===== ANIMACIONES DE ENTRADA ===== */
  const topBarAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const heroContentAnim = useRef(new Animated.Value(0)).current;
  const sectionStatsAnim = useRef(new Animated.Value(0)).current;
  const statsBoxAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(topBarAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(heroAnim, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroContentAnim, {
          toValue: 1,
          duration: 520,
          delay: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(sectionStatsAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(statsBoxAnim, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    topBarAnim,
    heroAnim,
    heroContentAnim,
    sectionStatsAnim,
    statsBoxAnim,
    footerAnim,
  ]);

  const topBarStyle = {
    opacity: topBarAnim,
    transform: [
      {
        translateY: topBarAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-16, 0],
        }),
      },
    ],
  };

  const heroStyle = {
    opacity: heroAnim,
    transform: [
      {
        translateY: heroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
      {
        scale: heroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  const heroContentStyle = {
    opacity: heroContentAnim,
  };

  const sectionStatsStyle = {
    opacity: sectionStatsAnim,
    transform: [
      {
        translateY: sectionStatsAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  const statsBoxStyle = {
    opacity: statsBoxAnim,
    transform: [
      {
        translateY: statsBoxAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [26, 0],
        }),
      },
    ],
  };

  const footerStyle = {
    opacity: footerAnim,
  };

  const rows = isFarmacia
    ? [
        {
          icon: 'medical',
          label: 'Medicamentos activos',
          value: farm.totalMedicamentos,
          chip: 'Catálogo',
          color: colors.tealDeep,
          bg: colors.mint,
        },
        {
          icon: 'warning',
          label: 'Stock bajo o sin stock',
          value: farm.stockBajo + farm.sinStock,
          chip: 'Revisar',
          color: colors.warning,
          bg: colors.warningTint,
        },
        {
          icon: 'alert-circle',
          label: 'Lotes por caducar / vencidos',
          value: `${farm.lotesPorCaducar} / ${farm.lotesCaducados}`,
          chip: '30 días',
          color: colors.danger,
          bg: colors.dangerTint,
        },
      ]
    : [
        {
          icon: 'people',
          label: 'Pacientes totales',
          value: stats.totalPatients,
          chip: 'Registrados',
          color: colors.tealDeep,
          bg: colors.mint,
        },
        {
          icon: 'warning',
          label: 'Casos urgentes',
          value: stats.yellowCount,
          chip: 'Amarillo',
          color: colors.warning,
          bg: colors.warningTint,
        },
        {
          icon: 'alert-circle',
          label: 'Casos críticos',
          value: stats.redCount,
          chip: 'Rojo',
          color: colors.danger,
          bg: colors.dangerTint,
        },
      ];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <Animated.View style={[s.topBar, topBarStyle]}>
          {/* Los módulos se abren desde la barra lateral */}
          <BotonMenu style={s.menuButton} />

          <View style={{ flex: 1 }}>
            <Text style={s.brandSmall}>
              Health<Text style={s.brandAccent}>Nexus</Text>
            </Text>

            <Text style={s.systemText}>Gestión hospitalaria</Text>
          </View>

          <Pressable
            style={s.profileButton}
            onPress={menu ? menu.abrir : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Perfil de ${user?.nombre || 'usuario'}`}
          >
            <Text style={s.profileInitial}>
              {(user?.nombre || 'U').charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ====================================================
            WELCOME
        ==================================================== */}

        <Animated.View style={[s.hero, heroStyle]}>
          <Animated.View style={heroContentStyle}>
            <View style={s.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroWelcome}>BUEN DÍA</Text>

                <Text style={s.heroTitle}>
                  {user?.nombre || 'Usuario'}
                </Text>

                <Text style={s.heroSub}>
                  {ROL[user?.rol] || user?.rol}
                </Text>
              </View>

              <View style={s.status}>
                <View style={s.statusDot} />
                <Text style={s.statusText}>En línea</Text>
              </View>
            </View>

            <View style={s.connection}>
              <View style={s.connectionIcon}>
                <Ico
                  name="shield-checkmark"
                  size={18}
                  color="#fff"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.connectionTitle}>
                  Sesión segura
                </Text>

                <Text style={s.connectionSub}>
                  Conectado a HealthNexus
                </Text>
              </View>
            </View>

            
          </Animated.View>
        </Animated.View>

        {/* ====================================================
            DAILY SUMMARY
        ==================================================== */}

        <Animated.View
          style={[s.sectionHeader, sectionStatsStyle]}
        >
          <View>
            <Text style={s.sectionTitle}>Resumen del día</Text>
            <Text style={s.sectionSub}>
              Información actual del sistema
            </Text>
          </View>

          <Text style={s.date}>{date}</Text>
        </Animated.View>

        <ErrorBox message={error} onRetry={reload} />

        {/* ====================================================
            STATS
        ==================================================== */}

        <Animated.View style={[s.stats, statsBoxStyle]}>
          {rows.map((r, i) => (
            <StatRow
              key={r.label}
              row={r}
              index={i}
              isLast={i === rows.length - 1}
            />
          ))}
        </Animated.View>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <Animated.View style={[s.footer, footerStyle]}>
          <Ico
            name="shield-checkmark-outline"
            size={14}
            color={colors.teal}
          />

          <Text style={s.footerText}>
            Información protegida por HealthNexus
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 80,
  },

  /* ==========================================================
     TOP BAR
  ========================================================== */

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
  },

  brandSmall: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.7,
  },

  brandAccent: {
    color: colors.tealDeep,
  },

  systemText: {
    fontSize: 11,
    color: colors.sub,
    marginTop: 2,
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.tealDeep,
  },

  /* ==========================================================
     HERO
  ========================================================== */

  hero: {
    backgroundColor: colors.tealDeep,
    borderRadius: 28,
    padding: 24,
    marginBottom: 30,
    ...shadow,
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  heroWelcome: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 7,
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 5,
  },

  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '500',
  },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 10,
    backgroundColor: '#8FD6A8',
    marginRight: 6,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 17,
    padding: 12,
    marginTop: 22,
  },

  connectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  connectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  connectionSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },



  /* ==========================================================
     SECTIONS
  ========================================================== */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
  },

  sectionSub: {
    fontSize: 11,
    color: colors.sub,
    marginTop: 3,
  },



  date: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.sub,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 125,
    textAlign: 'center',
  },

  /* ==========================================================
     MODULE GRID
  ========================================================== */


  /* Contenedor externo: animación, ancho, radio, sombra */

  /* Contenedor interno: padding y layout del contenido */




  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },

  tagText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* ==========================================================
     STATS
  ========================================================== */

  stats: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 18,
    ...shadow,
  },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  statInfo: {
    flex: 1,
  },

  statLabel: {
    fontSize: 11,
    color: colors.sub,
    fontWeight: '500',
    marginBottom: 3,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  chipText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
    gap: 6,
  },

  footerText: {
    fontSize: 10,
    color: colors.faint,
  },
});