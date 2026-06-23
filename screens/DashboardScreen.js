// FILE: screens/DashboardScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Animated, 
  Dimensions, 
  TouchableOpacity 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import Header from '../components/Header';
import SummaryCard from '../components/SummaryCard';
import AlertCard from '../components/AlertCard';
import { SENSORS } from '../constants/sensors';
import { useFirebaseSensors } from '../hooks/useFirebaseSensors';
import { useAuth } from '../hooks/useAuth';

import { ref, onValue } from 'firebase/database';
import { db } from '../firebase/config';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { userData } = useAuth();
  const { sensors, activeAlerts, loading } = useFirebaseSensors();
  const [refreshing, setRefreshing] = useState(false);
  const [defenseState, setDefenseState] = useState(null);

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const statusPulse = useRef(new Animated.Value(1)).current;
  const signalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Listen to Defense System state
    const defenseRef = ref(db, 'defense_system');
    const unsubDefense = onValue(defenseRef, (snapshot) => {
      if (snapshot.exists()) {
        setDefenseState(snapshot.val());
      }
    });

    // Pulse animation for LIVE status
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(statusPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Signal bars animation (cannot use native driver for height animation)
    Animated.loop(
      Animated.timing(signalAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = userData?.name || 'User';
  const onlineSensorsCount = Object.values(sensors).length;
  const totalSensors = Object.keys(SENSORS).length;

  // Signal Bar Component for "Live" feel
  const SignalVisualizer = () => (
    <View style={styles.signalContainer}>
      {[1, 2, 3, 4, 5].map((i) => {
        const height = signalAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [10 + i * 2, 25 - i, 10 + i * 2],
        });
        return (
          <Animated.View 
            key={i} 
            style={[styles.signalBar, { height, opacity: 0.6 + i * 0.08 }]} 
          />
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />
      
      <Header 
        title="EleGuard" 
        onProfilePress={() => navigation.navigate('Settings')} 
      />

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}, {userName}</Text>
              <Text style={styles.statusSubtext}>System integrity is high</Text>
            </View>
            <TouchableOpacity 
              style={styles.liveStatusBadge}
              onPress={() => navigation.navigate('Heatmap')}
            >
              <Animated.View style={[styles.pulseDot, { transform: [{ scale: statusPulse }] }]} />
              <Text style={styles.liveText}>Live</Text>
            </TouchableOpacity>
          </View>

          {/* Safety Status Visualizer */}
          <View style={[styles.safetyCard, activeAlerts.length > 0 && styles.safetyCardAlert]}>
            <View style={styles.safetyInfo}>
              <Text style={styles.safetyTitle}>Farm Security Status</Text>
              <Text style={[styles.safetyValue, activeAlerts.length > 0 && { color: '#FF5252' }]}>
                {activeAlerts.length > 0 ? 'Intrusion Detected' : 'All Zones Secure'}
              </Text>
            </View>
            <SignalVisualizer />
          </View>

          {/* Defense System Status Card */}
          <TouchableOpacity 
            style={styles.defenseStatusCard}
            onPress={() => navigation.navigate('DefendingSystem')}
            activeOpacity={0.8}
          >
            <View style={styles.defenseStatusLeft}>
              <View style={[styles.defenseIconBg, { backgroundColor: defenseState?.autoDefense ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)' }]}>
                <MaterialCommunityIcons 
                  name={defenseState?.autoDefense ? "shield-check" : "shield-off"} 
                  size={24} 
                  color={defenseState?.autoDefense ? COLORS.primary : "#FF9800"} 
                />
              </View>
              <View>
                <Text style={styles.defenseStatusTitle}>Automated Defense</Text>
                <Text style={[styles.defenseStatusValue, { color: defenseState?.autoDefense ? COLORS.primary : "#FF9800" }]}>
                  {defenseState?.autoDefense ? 'SYSTEM ARMED' : 'MANUAL MODE'}
                </Text>
              </View>
            </View>
            <View style={styles.defenseStatusRight}>
              <Text style={styles.defenseModeText}>{defenseState?.status || 'STANDBY'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.outline} />
            </View>
          </TouchableOpacity>

          {/* Summary Grid */}
          <View style={styles.summaryGrid}>
            <SummaryCard
              title="Active Alerts"
              value={activeAlerts.length.toString()}
              icon="alert-decagram"
              color={activeAlerts.length > 0 ? COLORS.severity_HIGH : COLORS.primary}
              delay={100}
            />
            <View style={{ width: 12 }} />
            <SummaryCard
              title="Sensors"
              value={`${onlineSensorsCount}/${totalSensors}`}
              icon="wifi-check"
              color={COLORS.primary}
              delay={200}
            />
          </View>

          {/* Alerts Section */}
          <View style={styles.alertsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Real-time Alerts</Text>
              {activeAlerts.length > 0 && <View style={styles.alertDot} />}
            </View>

            {activeAlerts.length === 0 ? (
              <View style={styles.noAlertsCard}>
                <View style={styles.safeIconContainer}>
                  <MaterialCommunityIcons name="shield-check" size={48} color={COLORS.primary} />
                </View>
                <Text style={styles.noAlertsTitle}>Your farm is safe</Text>
                <Text style={styles.noAlertsDesc}>
                  We are monitoring all {totalSensors} sensors. Relax, we've got you covered.
                </Text>
              </View>
            ) : (
              activeAlerts.map((alert, index) => (
                <AlertCard 
                  key={alert.sensorId} 
                  alert={alert}
                  index={index}
                  onPress={() => navigation.navigate('AlertDetail', { alert })} 
                />
              ))
            )}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  bgGlow1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    zIndex: -1,
  },
  bgGlow2: {
    position: 'absolute',
    bottom: '20%',
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(120, 220, 119, 0.05)',
    zIndex: -1,
  },
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    ...TYPOGRAPHY.headlineLG,
    fontSize: 26,
    color: '#FFF',
    fontWeight: '700',
  },
  statusSubtext: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  liveText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  safetyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  safetyCardAlert: {
    borderColor: 'rgba(255, 82, 82, 0.3)',
    backgroundColor: 'rgba(255, 82, 82, 0.05)',
  },
  safetyInfo: {
    flex: 1,
  },
  safetyTitle: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    marginBottom: 4,
  },
  safetyValue: {
    ...TYPOGRAPHY.headlineMD,
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  defenseStatusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  defenseStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defenseIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defenseStatusTitle: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  defenseStatusValue: {
    ...TYPOGRAPHY.bodyLG,
    fontWeight: '700',
    fontSize: 14,
  },
  defenseStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defenseModeText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 30,
  },
  signalBar: {
    width: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  alertsContainer: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 20,
    color: '#FFF',
    fontWeight: '700',
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5252',
  },
  noAlertsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  safeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noAlertsTitle: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
    marginBottom: 8,
  },
  noAlertsDesc: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
