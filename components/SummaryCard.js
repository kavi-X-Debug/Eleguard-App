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
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <View style={styles.header}>
        <Animated.View style={[styles.iconBg, { backgroundColor: `${color}15`, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }]}>
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
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(27, 94, 32, 0.4)',
    padding: 14,
    flex: 1,
    minHeight: 120,
  },
  header: {
    marginBottom: 10,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  value: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 22,
    marginBottom: 4,
  },
  title: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
});
