// FILE: components/TransmissionBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TransmissionBadge({ id, data }) {
  const isActive = data?.isActive === true || data?.isActive === "true";
  const isAlert = isActive && (data?.severity === 'HIGH' || data?.severity === 'CRITICAL' || data?.severity === 'MEDIUM');
  
  const getStatusColor = () => {
    if (isAlert) return data?.severity === 'CRITICAL' ? COLORS.severity_CRITICAL : COLORS.severity_HIGH;
    if (isActive) return COLORS.primary;
    return COLORS.outlineVariant;
  };

  const statusColor = getStatusColor();

  return (
    <View style={[styles.container, { borderColor: `${statusColor}40` }]}>
      <View style={styles.header}>
        <Text style={[styles.sensorId, { color: statusColor }]}>{id}</Text>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
      </View>
      <View style={styles.content}>
        <Text style={styles.value}>{data?.amplitude?.toFixed(1) || '0.0'}</Text>
        <Text style={styles.unit}>v/s</Text>
      </View>
      <Text style={styles.time} numberOfLines={1}>
        {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '23%',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sensorId: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 14,
    fontWeight: '800',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  value: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 18,
    color: '#FFF',
  },
  unit: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    color: COLORS.onSurfaceVariant,
  },
  time: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 9,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
});
