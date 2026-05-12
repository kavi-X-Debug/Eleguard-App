import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Alert, Animated, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ref, onValue, update, set, push, serverTimestamp } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import Header from '../components/Header';
import DefenseLog from '../components/DefenseLog';
import { useAuth } from '../hooks/useAuth';

export default function DefendingSystemScreen({ navigation }) {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';



  const [systemState, setSystemState] = useState({
    autoDefense: true,
    buzzerEnabled: false,
    impulseEnabled: false,
    status: 'STANDBY',
    intensity: 'MED',
    lastActivated: { zone: 'None', time: 'Never' }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const defenseRef = ref(db, 'defense_system');
    const logsRef = ref(db, 'defense_logs');

    const unsubDefense = onValue(defenseRef, (snapshot) => {
      if (snapshot.exists()) {
        setSystemState(snapshot.val());
      } else {
        if (isAdmin) {
          set(defenseRef, {
            autoDefense: true,
            buzzerEnabled: false,
            impulseEnabled: false,
            status: 'STANDBY',
            intensity: 'MED',
            lastActivated: { zone: 'None', time: 'Never' }
          }).catch(err => setError(err.message));
        }
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Defense System Error:", err);
      setError("Unable to connect to Defense System. You may not have permission.");
      setLoading(false);
    });

    const unsubLogs = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const logList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).reverse();
        setLogs(logList.slice(0, 10));
      }
    }, (err) => console.error("Logs Error:", err));

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    return () => {
      unsubDefense();
      unsubLogs();
      clearTimeout(timeout);
    };
  }, [isAdmin]);



  const toggleSetting = (key, value) => {
    if (!isAdmin) return;
    update(ref(db, 'defense_system'), { [key]: value });
  };

  const setIntensity = (level) => {
    if (!isAdmin) return;
    update(ref(db, 'defense_system'), { intensity: level });
  };

  const triggerManualAction = async (type, action) => {
    if (!isAdmin) return;
    
    try {
      const isActivating = action === 'START' || action === 'ACTIVATE';
      
      await update(ref(db, 'defense_system'), {
        status: isActivating ? 'ACTIVE' : 'STANDBY',
        [type.toLowerCase() + 'Enabled']: isActivating,
        lastActivated: isActivating ? { zone: 'Manual', time: new Date().toLocaleTimeString() } : systemState.lastActivated
      });

      if (isActivating) {
        // Log the action
        await push(ref(db, 'defense_logs'), {
          type: type.toUpperCase(),
          zone: 'Manual Override',
          triggerType: 'MANUAL',
          timestamp: serverTimestamp(),
          outcome: 'SUCCESS',
          duration: 30
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger defense: ' + error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title="EleGuard" 
        showBack 
        onBack={() => navigation.goBack()} 
        onProfilePress={() => navigation.navigate('Settings')}
      />
      
      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-octagon" size={20} color="#FFF" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}


      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Defending System</Text>
            <Text style={styles.pageSubtitle}>
              {systemState.autoDefense ? 'Auto Defense is Active' : 'Manual Mode Only'}
            </Text>
          </View>
          <View style={[styles.roleBadge, !isAdmin && { borderColor: COLORS.outlineVariant }]}>
            <Text style={[styles.roleBadgeText, !isAdmin && { color: COLORS.onSurfaceVariant }]}>
              {isAdmin ? '👑 ADMIN' : 'FARMER'}
            </Text>
          </View>
        </View>

        <View style={[styles.statusCard, systemState.status === 'ACTIVE' && { borderColor: COLORS.severity_HIGH }]}>
          <View style={[styles.pulseDot, systemState.status === 'ACTIVE' && { backgroundColor: COLORS.severity_HIGH }]} />
          <View>
            <Text style={[styles.statusTitle, systemState.status === 'ACTIVE' && { color: COLORS.severity_HIGH }]}>
              {systemState.status}
            </Text>
            <Text style={styles.statusSub}>Auto Defense: {systemState.autoDefense ? 'ON' : 'OFF'}</Text>
            <Text style={styles.statusMeta}>Last activated: {systemState.lastActivated.zone} · {systemState.lastActivated.time}</Text>
          </View>
        </View>

        {/* Auto Defense Switch */}
        <View style={[styles.card, !isAdmin && styles.cardDisabled]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="shield-sync" size={24} color={COLORS.primary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Auto Defense</Text>
            {!isAdmin && <MaterialCommunityIcons name="lock" size={20} color={COLORS.outlineVariant} style={styles.lockIcon} />}
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>System Automation</Text>
            <Switch 
              value={systemState.autoDefense} 
              onValueChange={(val) => toggleSetting('autoDefense', val)} 
              disabled={!isAdmin}
              trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }}
            />
          </View>
        </View>

        {/* Buzzer Control */}
        <View style={[styles.card, !isAdmin && styles.cardDisabled]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="volume-high" size={24} color={COLORS.primary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Alarm Buzzer</Text>
            {!isAdmin && <MaterialCommunityIcons name="lock" size={20} color={COLORS.outlineVariant} style={styles.lockIcon} />}
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Enable Buzzer</Text>
            <Switch 
              value={systemState.buzzerEnabled} 
              onValueChange={(val) => toggleSetting('buzzerEnabled', val)} 
              disabled={!isAdmin}
              trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }}
            />
          </View>
          {isAdmin && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.testBtn} onPress={() => triggerManualAction('BUZZER', 'START')}>
                <Text style={styles.testBtnText}>▶ TEST</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stopBtn} onPress={() => triggerManualAction('BUZZER', 'STOP')}>
                <Text style={styles.stopBtnText}>⏹ STOP</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Impulse Wave Control */}
        <View style={[styles.card, !isAdmin && styles.cardDisabled]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="pulse" size={24} color={COLORS.primary} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Impulse Wave</Text>
            {!isAdmin && <MaterialCommunityIcons name="lock" size={20} color={COLORS.outlineVariant} style={styles.lockIcon} />}
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Enable Impulse</Text>
            <Switch 
              value={systemState.impulseEnabled} 
              onValueChange={(val) => toggleSetting('impulseEnabled', val)} 
              disabled={!isAdmin}
              trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Intensity</Text>
            <View style={styles.pillGroup}>
              {['LOW', 'MED', 'HIGH'].map((level) => (
                <TouchableOpacity 
                  key={level}
                  onPress={() => setIntensity(level)}
                  disabled={!isAdmin}
                  style={[styles.pill, systemState.intensity === level && styles.pillActive]}
                >
                  <Text style={[styles.pillText, systemState.intensity === level && styles.pillTextActive]}>
                    {systemState.intensity === level ? '● ' : ''}{level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Manual Override Buttons */}
        {isAdmin && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Manual Override</Text>
            <TouchableOpacity 
              style={styles.dangerBtn} 
              onPress={() => triggerManualAction('BUZZER', 'ACTIVATE')}
            >
              <Text style={styles.dangerBtnText}>🔊 ACTIVATE BUZZER NOW</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dangerBtn} 
              onPress={() => triggerManualAction('IMPULSE', 'ACTIVATE')}
            >
              <Text style={styles.dangerBtnText}>〰️ ACTIVATE IMPULSE NOW</Text>
            </TouchableOpacity>

          </View>
        )}

        <View style={styles.logSection}>
          <Text style={styles.sectionTitle}>Defense Log</Text>
          {logs.length === 0 ? (
            <Text style={{ color: COLORS.onSurfaceVariant, textAlign: 'center' }}>No logs yet</Text>
          ) : (
            logs.map(log => <DefenseLog key={log.id} log={log} />)
          )}
        </View>

      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorBanner: {
    backgroundColor: COLORS.severity_HIGH,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorBannerText: {
    ...TYPOGRAPHY.labelLG,
    color: '#FFF',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
  },
  pageSubtitle: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.primary,
  },
  roleBadge: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.severity_LOW,
  },
  roleBadgeText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.severity_LOW,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  pulseDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    marginRight: 16,
  },
  statusTitle: {
    ...TYPOGRAPHY.headlineMD,
    color: COLORS.primary,
  },
  statusSub: {
    ...TYPOGRAPHY.bodyLG,
    color: '#FFF',
  },
  statusMeta: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    marginBottom: 16,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    marginRight: 8,
  },
  cardTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 18,
    color: '#FFF',
    flex: 1,
  },
  lockIcon: {
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerHigh,
  },
  rowLabel: {
    ...TYPOGRAPHY.bodyLG,
    color: COLORS.onSurface,
  },
  rowValue: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  testBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testBtnText: {
    ...TYPOGRAPHY.labelLG,
    color: '#FFF',
  },
  stopBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopBtnText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.severity_HIGH,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  pillActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primaryContainer,
  },
  pillText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  pillTextActive: {
    color: COLORS.onPrimary,
  },
  dangerBtn: {
    backgroundColor: COLORS.severity_HIGH,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  dangerBtnText: {
    ...TYPOGRAPHY.button,
    color: '#FFF',
  },
  outlineBtn: {
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  outlineBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onSurfaceVariant,
  },
  btnDisabled: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderColor: COLORS.surfaceContainerHigh,
  },
  logSection: {
    marginTop: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 18,
    color: '#FFF',
    marginBottom: 16,
  },
});
