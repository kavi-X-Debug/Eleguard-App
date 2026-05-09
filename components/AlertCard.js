// FILE: components/AlertCard.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import SeverityBadge from './SeverityBadge';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AlertCard({ alert, onPress, index = 0 }) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const borderPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered slide-in entrance
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse the left border for HIGH or CRITICAL severity
    if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(borderPulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, friction: 5, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  };

  const getBorderColor = () => {
    const sev = alert.severity?.toString().toUpperCase();
    switch (sev) {
      case 'CRITICAL': return COLORS.severity_CRITICAL;
      case 'HIGH': return COLORS.severity_HIGH;
      case 'MEDIUM': return COLORS.severity_MEDIUM;
      case 'LOW': return COLORS.severity_LOW;
      default: return COLORS.severity_SAFE;
    }
  };

  const getTimeAgo = (timestamp) => {
    const diffMs = new Date() - new Date(timestamp);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnim }, { scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity 
        onPress={onPress} 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        <View style={[styles.card, { borderLeftColor: getBorderColor() }]}>
          {/* Severity glow for HIGH/CRITICAL alerts */}
          {(alert.severity?.toString().toUpperCase() === 'HIGH' || alert.severity?.toString().toUpperCase() === 'CRITICAL') && (
            <Animated.View style={[styles.glowOverlay, { 
              opacity: borderPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
              backgroundColor: alert.severity?.toString().toUpperCase() === 'CRITICAL' ? COLORS.severity_CRITICAL : COLORS.severity_HIGH,
            }]} />
          )}

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="map-marker" size={16} color={getBorderColor()} />
              <Text style={styles.title}>{alert.zone} · {alert.sensorId}</Text>
            </View>
            <Text style={styles.timestamp}>{getTimeAgo(alert.timestamp)}</Text>
          </View>
          
          <View style={styles.contentRow}>
            <View style={styles.leftCol}>
              <SeverityBadge severity={alert.severity} />
              {alert.falseAlarm && (
                <View style={styles.falseAlarmBadge}>
                  <Text style={styles.falseAlarmText}>FALSE ALARM</Text>
                </View>
              )}
            </View>
            <View style={styles.rightCol}>
              <Text style={styles.amplitudeLabel}>Amplitude</Text>
              <Text style={[styles.amplitudeValue, { color: getBorderColor() }]}>
                {alert.amplitude?.toFixed(1) || '0.0'}
              </Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <MaterialCommunityIcons name="elephant" size={20} color={COLORS.onSurfaceVariant} />
            <Text style={styles.footerText}>
              Approach detected {alert.crossedBoundary ? 'INSIDE' : 'AT'} boundary
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 14,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(27, 94, 32, 0.3)',
    overflow: 'hidden',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 18,
    color: COLORS.onSurface,
  },
  timestamp: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  leftCol: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amplitudeLabel: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
  },
  amplitudeValue: {
    ...TYPOGRAPHY.headlineLG,
    fontSize: 28,
  },
  falseAlarmBadge: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  falseAlarmText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    color: COLORS.outline,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerHigh,
  },
  footerText: {
    flex: 1,
    ...TYPOGRAPHY.bodyMD,
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
});
