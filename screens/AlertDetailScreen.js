// FILE: screens/AlertDetailScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import Header from '../components/Header';
import SeverityBadge from '../components/SeverityBadge';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ref, update } from 'firebase/database';
import { db } from '../firebase/config';
import AudioService from '../services/AudioService';

export default function AlertDetailScreen({ route, navigation }) {
  const { alert } = route.params;

  // Animations
  const heroSlide = useRef(new Animated.Value(-40)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const sheetSlide = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const pulseDot = useRef(new Animated.Value(1)).current;
  const btnScale1 = useRef(new Animated.Value(1)).current;
  const btnScale2 = useRef(new Animated.Value(1)).current;
  const btnScale3 = useRef(new Animated.Value(1)).current;

  const severityColor = () => {
    switch (alert.severity) {
      case 'CRITICAL': return COLORS.severity_CRITICAL;
      case 'HIGH': return COLORS.severity_HIGH;
      case 'MEDIUM': return COLORS.severity_MEDIUM;
      case 'LOW': return COLORS.severity_LOW;
      case 'SAFE': return COLORS.severity_SAFE;
      default: return COLORS.primary;
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(sheetSlide, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(sheetOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseDot, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseDot, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const makeScaleHandlers = (anim) => ({
    onPressIn: () => Animated.spring(anim, { toValue: 0.95, friction: 5, useNativeDriver: true }).start(),
    onPressOut: () => Animated.spring(anim, { toValue: 1, friction: 5, useNativeDriver: true }).start(),
  });

  const handleAcknowledge = () => {
    AudioService.stopAlarm();
    Alert.alert('Acknowledged', 'Alert has been acknowledged. Rangers have been notified.', [{ text: 'OK' }]);
  };

  const handleFalseAlarm = () =>
    Alert.alert('Mark as False Alarm', 'Are you sure this was a false alarm?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        AudioService.stopAlarm();
        try {
          await update(ref(db, `iot_signals/${alert.sensorId}`), {
            falseAlarm: true,
            isActive: false,
            severity: 'SAFE'
          });
          navigation.goBack();
        } catch (e) {
          Alert.alert('Error', 'Failed to update: ' + e.message);
        }
      }},
    ]);

  const handleResolve = () =>
    Alert.alert('Resolve Alert', 'Mark this alert as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resolve', style: 'destructive', onPress: async () => {
        AudioService.stopAlarm();
        try {
          // Setting isActive to false but keeping severity context or setting it to SAFE
          await update(ref(db, `iot_signals/${alert.sensorId}`), {
            isActive: false,
            falseAlarm: false,
            severity: 'SAFE'
          });
          navigation.goBack();
        } catch (e) {
          Alert.alert('Error', 'Failed to resolve: ' + e.message);
        }
      }},
    ]);

  const color = severityColor();

  return (
    <View style={styles.container}>
      <Header title="EleGuard" showBack onBack={() => navigation.goBack()} />

      {/* Hero Banner */}
      <Animated.View style={[styles.hero, { transform: [{ translateY: heroSlide }], opacity: heroOpacity, backgroundColor: `${color}20` }]}>
        <View style={[styles.heroAccent, { backgroundColor: color }]} />
        <View style={styles.heroContent}>
          <View style={styles.pillBadge}>
            <Animated.View style={[styles.pulseDotView, { transform: [{ scale: pulseDot }], backgroundColor: color }]} />
            <Text style={[styles.pillText, { color }]}>LIVE TRACKING · {alert.severity}</Text>
          </View>
          <Text style={styles.heroTitle}>🐘 Elephant Intrusion Alert</Text>
          <Text style={styles.heroSubtitle}>Activity detected at {alert.zone} · Sensor {alert.sensorId}</Text>
        </View>
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetSlide }], opacity: sheetOpacity }]}>
        <View style={styles.pullIndicator} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Metric Grid */}
          <View style={styles.metricGrid}>
            {[
              { label: 'STRENGTH', value: `${alert.amplitude?.toFixed(1) || '0.0'} v/s`, icon: 'waveform', color },
              { label: 'PROXIMITY', value: '~12m', icon: 'map-marker-distance', color: COLORS.severity_MEDIUM },
              { label: 'CONFIDENCE', value: '92%', icon: 'check-circle', color: COLORS.primary },
              { label: 'STATUS', value: alert.falseAlarm ? 'FALSE' : 'ACTIVE', icon: 'elephant', color: alert.falseAlarm ? COLORS.outline : color },
            ].map((m, i) => (
              <View key={i} style={[styles.metricCard, { borderColor: `${m.color}30` }]}>
                <MaterialCommunityIcons name={m.icon} size={18} color={m.color} style={{ marginBottom: 6 }} />
                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* Detail Strip */}
          <View style={styles.detailsRow}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Severity</Text>
              <SeverityBadge severity={alert.severity} />
            </View>
            <View style={styles.separator} />
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Zone</Text>
              <Text style={styles.detailText}>{alert.zone}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Sensor</Text>
              <Text style={styles.detailText}>{alert.sensorId}</Text>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Timeline</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: color }]}>
                  <MaterialCommunityIcons name="radar" size={10} color="#FFF" />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Detected by {alert.sensorId}</Text>
                  <Text style={styles.timelineTime}>{new Date(alert.timestamp || Date.now()).toLocaleTimeString()}</Text>
                </View>
              </View>
              <View style={[styles.timelineLine, { backgroundColor: color, opacity: 0.3 }]} />
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: COLORS.surfaceContainerHigh }]}>
                  <MaterialCommunityIcons name="bell" size={10} color={COLORS.onSurfaceVariant} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineTitle, { color: COLORS.onSurfaceVariant }]}>Notification sent</Text>
                  <Text style={styles.timelineTime}>Awaiting acknowledgement</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Animated.View style={{ transform: [{ scale: btnScale1 }] }}>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: color }]}
                onPress={handleAcknowledge}
                {...makeScaleHandlers(btnScale1)}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                <Text style={styles.btnPrimaryText}>ACKNOWLEDGE</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.btnRow}>
              <Animated.View style={[{ flex: 1 }, { transform: [{ scale: btnScale2 }] }]}>
                <TouchableOpacity style={styles.btnOutline} onPress={handleFalseAlarm} {...makeScaleHandlers(btnScale2)} activeOpacity={0.9}>
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color={COLORS.onSurface} />
                  <Text style={styles.btnOutlineText}>FALSE ALARM</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={[{ flex: 1 }, { transform: [{ scale: btnScale3 }] }]}>
                <TouchableOpacity style={[styles.btnOutline, { borderColor: COLORS.severity_HIGH }]} onPress={handleResolve} {...makeScaleHandlers(btnScale3)} activeOpacity={0.9}>
                  <MaterialCommunityIcons name="shield-check-outline" size={16} color={COLORS.severity_HIGH} />
                  <Text style={[styles.btnOutlineText, { color: COLORS.severity_HIGH }]}>RESOLVE</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    paddingTop: 24,
    paddingBottom: 48,
    position: 'relative',
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  heroContent: {
    paddingHorizontal: 24,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    gap: 8,
  },
  pulseDotView: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
  },
  heroTitle: {
    ...TYPOGRAPHY.headlineLG,
    fontSize: 28,
    color: '#FFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  pullIndicator: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '47%',
    backgroundColor: COLORS.surfaceContainer,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  metricLabel: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  metricValue: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 20,
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  separator: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  detailCol: {
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 15,
    color: COLORS.onSurface,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 18,
    color: '#FFF',
    marginBottom: 14,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 15,
    color: COLORS.onSurface,
  },
  timelineTime: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  timelineLine: {
    width: 2,
    height: 28,
    marginLeft: 13,
    marginVertical: 4,
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
  btnPrimary: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPrimaryText: {
    ...TYPOGRAPHY.button,
    fontSize: 16,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnOutline: {
    flexDirection: 'row',
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnOutlineText: {
    ...TYPOGRAPHY.button,
    fontSize: 13,
    color: COLORS.onSurface,
    letterSpacing: 0.3,
  },
});
