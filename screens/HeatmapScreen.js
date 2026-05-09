// FILE: screens/HeatmapScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import FarmMap from '../components/FarmMap';
import { useFirebaseSensors } from '../hooks/useFirebaseSensors';

export default function HeatmapScreen({ navigation }) {
  const [mode, setMode] = useState('LIVE');
  const { sensors, loading } = useFirebaseSensors();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>Farm Heatmap</Text>

        {/* Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleBg}>
            <TouchableOpacity 
              style={[styles.toggleBtn, mode === 'LIVE' && styles.toggleBtnActive]}
              onPress={() => setMode('LIVE')}
            >
              <Text style={[styles.toggleText, mode === 'LIVE' && styles.toggleTextActive]}>LIVE</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, mode === 'HISTORY' && styles.toggleBtnActive]}
              onPress={() => setMode('HISTORY')}
            >
              <Text style={[styles.toggleText, mode === 'HISTORY' && styles.toggleTextActive]}>HISTORY</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Bar */}
        {mode === 'LIVE' && (
          <View style={styles.statusBar}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusText}>LIVE</Text>
          </View>
        )}

        {/* History Controls placeholder */}
        {mode === 'HISTORY' && (
          <View style={styles.historyBar}>
            <Text style={styles.statusText}>◀ Apr 20 · 14:00–15:00 ▶</Text>
          </View>
        )}

        {/* Map */}
        <FarmMap sensorsData={sensors} />

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.severity_CRITICAL }]} />
              <Text style={styles.legendText}>CRITICAL</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.severity_HIGH }]} />
              <Text style={styles.legendText}>HIGH</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.severity_MEDIUM }]} />
              <Text style={styles.legendText}>MEDIUM</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.severity_LOW }]} />
              <Text style={styles.legendText}>LOW</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>SAFE</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.outlineVariant }]} />
              <Text style={styles.legendText}>OFFLINE</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    ...TYPOGRAPHY.headlineXL,
    color: '#FFF',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  toggleContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  toggleBg: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 999,
    padding: 4,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primaryContainer,
  },
  toggleText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginRight: 10,
  },
  statusText: {
    ...TYPOGRAPHY.labelLG,
    color: '#FFF',
    flex: 1,
  },
  historyBar: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  legendContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
});
