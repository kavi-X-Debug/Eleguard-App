// FILE: screens/HeatmapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Easing 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import FarmMap from '../components/FarmMap';
import { useFirebaseSensors } from '../hooks/useFirebaseSensors';

export default function HeatmapScreen({ navigation }) {
  const { sensors, loading } = useFirebaseSensors();
  
  // Animations
  const radarAnim1 = useRef(new Animated.Value(0)).current;
  const radarAnim2 = useRef(new Animated.Value(0)).current;
  const radarAnim3 = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const riskAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    // Staggered Radar pulses
    const startRadarLoop = (anim, delay) => {
      Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        )
      ]).start();
    };

    startRadarLoop(radarAnim1, 0);
    startRadarLoop(radarAnim2, 1000);
    startRadarLoop(radarAnim3, 2000);

    // Risk meter animation
    Animated.timing(riskAnim, {
      toValue: 0.65, // Example risk level
      duration: 1500,
      delay: 500,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: false, // Using width/background
    }).start();
  }, []);

  const calculateOverallRisk = () => {
    const active = Object.values(sensors).filter(s => s.isActive && !s.falseAlarm && s.severity !== 'SAFE');
    if (active.length === 0) return { label: 'LOW', color: COLORS.primary, percent: 15 };
    if (active.some(s => s.severity === 'CRITICAL')) return { label: 'CRITICAL', color: COLORS.severity_CRITICAL, percent: 95 };
    if (active.some(s => s.severity === 'HIGH')) return { label: 'HIGH', color: COLORS.severity_HIGH, percent: 75 };
    return { label: 'MODERATE', color: COLORS.severity_MEDIUM, percent: 45 };
  };

  const risk = calculateOverallRisk();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Heatmap Analysis</Text>
            <Text style={styles.subtitle}>Geospatial activity monitoring</Text>
          </View>
          <TouchableOpacity 
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>



        {/* Risk Level Meter */}
        <View style={styles.riskMeterContainer}>
          <View style={styles.riskHeader}>
            <Text style={styles.riskLabel}>Overall Farm Risk</Text>
            <Text style={[styles.riskValue, { color: risk.color }]}>{risk.label}</Text>
          </View>
          <View style={styles.meterBg}>
            <Animated.View style={[styles.meterFill, { 
              width: riskAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: risk.color 
            }]} />
          </View>
        </View>

        <View style={styles.mapContainer}>
          <FarmMap sensorsData={sensors} />
          
          {[radarAnim1, radarAnim2, radarAnim3].map((anim, i) => (
            <Animated.View 
              key={i}
              style={[styles.radarOverlay, {
                transform: [{ scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 2.5]
                }) }],
                opacity: anim.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0, 0.3, 0]
                }),
              }]} 
            />
          ))}
        </View>

        {/* Dynamic Legend */}
        <View style={styles.legendWrapper}>
          <Text style={styles.legendTitle}>Sensor Activity Keys</Text>
          <View style={styles.legendGrid}>
            {[
              { label: 'CRITICAL', color: COLORS.severity_CRITICAL },
              { label: 'HIGH', color: COLORS.severity_HIGH },
              { label: 'MEDIUM', color: COLORS.severity_MEDIUM },
              { label: 'SAFE', color: COLORS.primary },
            ].map((item) => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Stats Strip */}
        <View style={styles.footerInfo}>
          <View style={styles.footerStat}>
            <Text style={styles.statVal}>{Object.keys(sensors).length}</Text>
            <Text style={styles.statLabel}>Sensors Online</Text>
          </View>
          <View style={styles.vDivider} />
          <View style={styles.footerStat}>
            <Text style={styles.statVal}>98%</Text>
            <Text style={styles.statLabel}>Uptime</Text>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 24,
  },
  title: {
    ...TYPOGRAPHY.headlineLG,
    fontSize: 28,
    color: '#FFF',
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  riskMeterContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskLabel: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
  },
  riskValue: {
    ...TYPOGRAPHY.labelLG,
    fontWeight: '700',
    letterSpacing: 1,
  },
  meterBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  mapContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  radarOverlay: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.primary,
    zIndex: 10,
    pointerEvents: 'none',
  },
  legendWrapper: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  legendTitle: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  legendText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
    gap: 32,
  },
  footerStat: {
    alignItems: 'center',
  },
  statVal: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 10,
    marginTop: 2,
  },
  vDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  }
});
