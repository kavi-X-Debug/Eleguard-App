// FILE: components/SummaryCard.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export default function SummaryCard({ title, value, icon, color, subtitle, delay = 0 }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Subtle glow pulse on the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <View style={styles.header}>
        <Animated.View style={[styles.iconBg, { 
          backgroundColor: `${color}20`, 
          opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
          transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }]
        }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </Animated.View>
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    flex: 1,
    minHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  value: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  title: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
    opacity: 0.7,
  },
});
