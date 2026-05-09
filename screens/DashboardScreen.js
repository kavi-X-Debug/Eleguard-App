// FILE: screens/DashboardScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import Header from '../components/Header';
import SummaryCard from '../components/SummaryCard';
import AlertCard from '../components/AlertCard';
import { SENSORS } from '../constants/sensors';
import { useFirebaseSensors } from '../hooks/useFirebaseSensors';


export default function DashboardScreen({ navigation }) {
  const { sensors, activeAlerts, loading } = useFirebaseSensors();
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(-20)).current;
  const sectionOpacity = useRef(new Animated.Value(0)).current;
  const emptyBounce = useRef(new Animated.Value(0)).current;
  const statusDotScale = useRef(new Animated.Value(1)).current;
  
  // Background Glow Animations
  const glow1X = useRef(new Animated.Value(0)).current;
  const glow1Y = useRef(new Animated.Value(0)).current;
  const glow2X = useRef(new Animated.Value(0)).current;
  const glow2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(greetingOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(greetingSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.spring(statusDotScale, { toValue: 1, friction: 4, useNativeDriver: true }), // Initial pop
    ]).start();

    Animated.timing(sectionOpacity, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true }).start();

    // Blinking status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusDotScale, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(statusDotScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Empty state bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(emptyBounce, { toValue: -10, duration: 800, useNativeDriver: true }),
        Animated.timing(emptyBounce, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Background Glow Loops
    const moveGlow = (val, to) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: to, duration: 5000 + Math.random() * 2000, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 5000 + Math.random() * 2000, useNativeDriver: true }),
        ])
      ).start();
    };

    moveGlow(glow1X, 100);
    moveGlow(glow1Y, 150);
    moveGlow(glow2X, -80);
    moveGlow(glow2Y, -120);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getHighestRiskZone = () => {
    if (activeAlerts.length === 0) return 'None';
    return activeAlerts[0].zone;
  };

  const onlineSensorsCount = Object.values(sensors).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      {/* Background Animated Glows */}
      <Animated.View style={[styles.glowSpot, { 
        backgroundColor: 'rgba(120, 220, 119, 0.08)', 
        top: '10%', right: '5%',
        transform: [{ translateX: glow1X }, { translateY: glow1Y }] 
      }]} />
      <Animated.View style={[styles.glowSpot, { 
        backgroundColor: 'rgba(76, 175, 80, 0.06)', 
        bottom: '20%', left: '10%',
        transform: [{ translateX: glow2X }, { translateY: glow2Y }] 
      }]} />

      <Header 
        title="EleGuard" 
        onProfilePress={() => navigation.navigate('Settings')} 
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
      >
        {/* Greeting Banner */}
        <Animated.View style={[styles.greetingBanner, { opacity: greetingOpacity, transform: [{ translateY: greetingSlide }] }]}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
            <Text style={styles.greetingSubtext}>Farm monitoring is active</Text>
          </View>
          <View style={styles.statusBadge}>
            <Animated.View style={[styles.statusDot, { transform: [{ scale: statusDotScale }] }]} />
            <Text style={styles.statusBadgeText}>LIVE</Text>
          </View>
        </Animated.View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Active Alerts"
            value={activeAlerts.length.toString()}
            icon="alert-circle"
            color={activeAlerts.length > 0 ? COLORS.severity_HIGH : COLORS.primary}
            delay={100}
          />
          <View style={styles.cardGap} />
          <SummaryCard
            title="Highest Risk"
            subtitle="Boundary zone"
            value={getHighestRiskZone()}
            icon="compass"
            color={COLORS.primary}
            delay={200}
          />
          <View style={styles.cardGap} />
          <SummaryCard
            title="Sensors Online"
            value={`${onlineSensorsCount}/${Object.keys(SENSORS).length}`}
            icon="motion-sensor"
            color={COLORS.severity_LOW}
            delay={300}
          />
        </View>

        {/* Live Alerts Section */}
        <Animated.View style={{ opacity: sectionOpacity }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Alerts</Text>
            {activeAlerts.length > 0 && (
              <View style={styles.alertCountBadge}>
                <Text style={styles.alertCountText}>{activeAlerts.length}</Text>
              </View>
            )}
          </View>

          {activeAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Animated.Text style={[styles.emptyStateEmoji, { transform: [{ translateY: emptyBounce }] }]}>
                🌿
              </Animated.Text>
              <Text style={styles.emptyStateTitle}>All Clear</Text>
              <Text style={styles.emptyStateSubtext}>No active elephant intrusions detected. Your farm is safe.</Text>
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
        </Animated.View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  greetingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(27, 94, 32, 0.3)',
  },
  greetingLeft: {
    flex: 1,
  },
  greetingText: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 20,
    color: '#FFF',
    marginBottom: 4,
  },
  greetingSubtext: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120, 220, 119, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(120, 220, 119, 0.3)',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    color: COLORS.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  cardGap: {
    width: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 22,
    color: '#FFF',
  },
  alertCountBadge: {
    backgroundColor: COLORS.severity_HIGH,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCountText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120, 220, 119, 0.15)',
  },
  emptyStateEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyStateTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 24,
    color: COLORS.primary,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  glowSpot: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    zIndex: -1,
  },

});
