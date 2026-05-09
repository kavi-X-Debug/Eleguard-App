// FILE: components/SeverityBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export default function SeverityBadge({ severity }) {
  const getColors = () => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: COLORS.severity_CRITICAL, text: '#FFF' };
      case 'HIGH':
        return { bg: COLORS.severity_HIGH, text: '#FFF' };
      case 'MEDIUM':
        return { bg: COLORS.severity_MEDIUM, text: '#FFF' };
      case 'LOW':
        return { bg: COLORS.severity_LOW, text: '#000' };
      case 'SAFE':
        return { bg: COLORS.severity_SAFE, text: '#FFF' };
      default:
        return { bg: COLORS.surfaceContainerHigh, text: COLORS.onSurfaceVariant };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{severity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    textTransform: 'uppercase',
  },
});
