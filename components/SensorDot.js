// FILE: components/SensorDot.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export default function SensorDot({ id, sensor, isAlert }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAlert) {
      // Pulse ring animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
      // Blink animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      blinkAnim.setValue(1);
    }
  }, [isAlert]);

  const getStatus = () => {
    const isActive = sensor?.isActive === true || sensor?.isActive === "true";
    const isFalseAlarm = sensor?.falseAlarm === true || sensor?.falseAlarm === "true";
    
    // If it was recently resolved or marked as SAFE
    if (sensor?.severity?.toString().toUpperCase() === 'SAFE' || isFalseAlarm) return 'SAFE';
    if (!sensor || !isActive) return 'OFFLINE';
    
    return sensor.severity?.toString().toUpperCase() || 'SAFE';
  };

  const status = getStatus();

  const getBorderColor = () => {
    switch (status) {
      case 'CRITICAL': return COLORS.severity_CRITICAL;
      case 'HIGH': return COLORS.severity_HIGH;
      case 'MEDIUM': return COLORS.severity_MEDIUM;
      case 'LOW': return COLORS.severity_LOW;
      default: return COLORS.heatmapCellBorder;
    }
  };

  const getBgColor = () => {
    switch (status) {
      case 'CRITICAL': return 'rgba(255, 0, 0, 0.25)';
      case 'HIGH': return 'rgba(255, 68, 68, 0.2)';
      case 'MEDIUM': return 'rgba(255, 136, 0, 0.15)';
      case 'LOW': return 'rgba(255, 215, 0, 0.12)';
      default: return COLORS.heatmapCellBg;
    }
  };

  const showElephant = status === 'HIGH' || status === 'CRITICAL';
  const isCritical = status === 'CRITICAL';

  return (
    <Animated.View style={[styles.cell, { borderColor: getBorderColor(), backgroundColor: getBgColor(), opacity: (status === 'HIGH' || status === 'CRITICAL') ? blinkAnim : 1 }]}>
      {/* Pulse ring for HIGH/CRITICAL */}
      {showElephant && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              borderColor: isCritical ? COLORS.severity_CRITICAL : COLORS.severity_HIGH,
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.6],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
      )}

      <Text style={[styles.label, { color: status === 'OFFLINE' ? COLORS.outlineVariant : '#FFF' }]}>{id}</Text>
      
      {showElephant && (
        <Text style={styles.elephantEmoji}>🐘</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: 75,
    height: 75,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 18,
    borderWidth: 2,
  },
  label: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 16,
    fontWeight: '700',
  },
  elephantEmoji: {
    fontSize: 18,
    marginTop: 2,
  },
});
