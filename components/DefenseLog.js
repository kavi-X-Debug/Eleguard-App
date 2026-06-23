// FILE: components/DefenseLog.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export default function DefenseLog({ log }) {
  const getIcon = () => {
    if (log.type === 'BUZZER') return 'volume-high';
    if (log.type === 'IMPULSE') return 'pulse';
    return 'shield-alert';
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, log.action?.includes('DISABLED') && { opacity: 0.5 }]}>
        <MaterialCommunityIcons name={getIcon()} size={20} color={COLORS.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{log.zone}</Text>
          <Text style={styles.timeText}>{getRelativeTime(log.timestamp)}</Text>
        </View>
        <Text style={styles.subtitle}>
          {log.action ? log.action : log.triggerType} · {log.type}
          {log.duration ? ` · ${log.duration}s` : ''}
          {log.severity ? ` · ${log.severity}` : ''}
        </Text>
      </View>
      <View style={[styles.badge, log.outcome !== 'SUCCESS' && { borderColor: COLORS.severity_HIGH }]}>
        <Text style={[styles.badgeText, log.outcome !== 'SUCCESS' && { color: COLORS.severity_HIGH }]}>
          {log.outcome || 'OK'}
        </Text>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  title: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurface,
    fontWeight: '700',
  },
  timeText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
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
