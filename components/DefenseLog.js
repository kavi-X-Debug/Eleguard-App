// FILE: components/DefenseLog.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export default function DefenseLog({ log }) {
  const getIcon = () => {
    if (log.type === 'BUZZER') return 'volume-high';
    if (log.type === 'IMPULSE') return 'wave';
    return 'shield-alert';
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={getIcon()} size={20} color={COLORS.onSurfaceVariant} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{log.zone} · {log.triggerType}</Text>
        <Text style={styles.subtitle}>{log.duration}s · {log.severity}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{log.outcome}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerHigh,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  badge: {
    backgroundColor: COLORS.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  badgeText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    color: COLORS.primary,
  },
});
