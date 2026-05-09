// FILE: screens/AlertHistoryScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import Header from '../components/Header';
import AlertCard from '../components/AlertCard';
import { useFirebaseSensors } from '../hooks/useFirebaseSensors';

const FILTERS = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'FALSE ALARM'];

const FILTER_COLORS = {
  CRITICAL: COLORS.severity_CRITICAL,
  HIGH: COLORS.severity_HIGH,
  MEDIUM: COLORS.severity_MEDIUM,
  LOW: COLORS.severity_LOW,
  'FALSE ALARM': COLORS.outline,
  All: COLORS.primary,
};

export default function AlertHistoryScreen({ navigation }) {
  const { sensors, loading } = useFirebaseSensors();
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const headerSlide = useRef(new Animated.Value(-30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(headerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(listOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getFilteredAlerts = () => {
    // Only show sensors that have at least one valid timestamp (indicating they've had an event)
    // Filter out "SAFE" type alerts from history as requested
    let history = Object.values(sensors)
      .filter(s => s.timestamp && s.severity?.toString().trim().toUpperCase() !== 'SAFE') 
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (activeFilter === 'FALSE ALARM') {
      return history.filter(s => s.falseAlarm === true || s.falseAlarm === "true");
    }
    
    if (activeFilter !== 'All') {
      return history.filter(s => {
        const sev = s.severity?.toString().trim().toUpperCase();
        const filter = activeFilter.trim().toUpperCase();
        const isFalseAlarm = s.falseAlarm === true || s.falseAlarm === "true";
        return sev === filter && !isFalseAlarm;
      });
    }
    
    return history;
  };

  const alerts = getFilteredAlerts();

  return (
    <View style={styles.container}>
      <Header 
        title="EleGuard" 
        onProfilePress={() => navigation.navigate('Settings')} 
      />

      {/* Header area */}
      <Animated.View style={[styles.headerArea, { transform: [{ translateY: headerSlide }], opacity: headerOpacity }]}>
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Alert History</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{alerts.length}</Text>
          </View>
        </View>
        <Text style={styles.syncText}>📡 Synced with Firebase · Real-time</Text>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingRight: 8 }}>
          {FILTERS.map(filter => {
            const isActive = activeFilter === filter;
            const color = FILTER_COLORS[filter];
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, isActive ? { backgroundColor: `${color}20`, borderColor: color } : styles.filterChipInactive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
              >
                {isActive && <View style={[styles.filterDot, { backgroundColor: color }]} />}
                <Text style={[styles.filterText, isActive ? { color } : styles.filterTextInactive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* List */}
      <Animated.View style={{ flex: 1, opacity: listOpacity }}>
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
        >
          {alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No Alerts Found</Text>
              <Text style={styles.emptySubtext}>No events match the selected filter.</Text>
            </View>
          ) : (
            alerts.map((alert, index) => (
              <AlertCard
                key={alert.sensorId + (alert.timestamp || index)}
                alert={alert}
                index={index}
                onPress={() => navigation.navigate('AlertDetail', { alert })}
              />
            ))
          )}
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
  headerArea: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.surfaceContainer,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerHigh,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  pageTitle: {
    ...TYPOGRAPHY.headlineLG,
    fontSize: 28,
    color: '#FFF',
  },
  countPill: {
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 13,
    color: COLORS.onPrimary,
  },
  syncText: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginBottom: 14,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  filterChipInactive: {
    backgroundColor: 'transparent',
    borderColor: COLORS.outlineVariant,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 13,
  },
  filterTextInactive: {
    color: COLORS.onSurfaceVariant,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 20,
    color: COLORS.onSurface,
    marginBottom: 6,
  },
  emptySubtext: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
});
