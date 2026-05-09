// FILE: screens/NotificationSettingsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import Header from '../components/Header';
import { SOUND_ASSETS, SOUND_OPTIONS } from '../constants/sounds';
import AudioService from '../services/AudioService';

export default function NotificationSettingsScreen({ navigation }) {
  const [prefs, setPrefs] = useState({
    HIGH: { sound: "Critical Alarm", overrideDND: true, wakeScreen: true, repeat: true },
    MEDIUM: { sound: "Classic Alarm", overrideDND: true, wakeScreen: false, repeat: true },
    LOW: { sound: "Warning Buzzer", overrideDND: false, wakeScreen: false, repeat: true },
    quietHours: { enabled: false, overrideHigh: true }
  });
  const [expanded, setExpanded] = useState('HIGH');
  const [isSoundModalVisible, setIsSoundModalVisible] = useState(false);
  const [activeLevelForSound, setActiveLevelForSound] = useState(null);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    try {
      const stored = await AsyncStorage.getItem('notif_prefs');
      if (stored) {
        setPrefs(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const savePrefs = async () => {
    try {
      await AsyncStorage.setItem('notif_prefs', JSON.stringify(prefs));
      navigation.goBack();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePref = (level, key) => {
    setPrefs(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [key]: !prev[level][key]
      }
    }));
  };

  const setSoundPref = (level, soundName) => {
    setPrefs(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        sound: soundName
      }
    }));
    // Play preview
    AudioService.playAlarm(soundName, false);
    setIsSoundModalVisible(false);
  };

  const toggleQuietHour = (key) => {
    setPrefs(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: !prev.quietHours[key]
      }
    }));
  };

  const playTestSound = async (level) => {
    const soundName = prefs[level].sound;
    await AudioService.playAlarm(soundName, false); // Don't loop for tests
  };

  useEffect(() => {
    return () => {
      AudioService.stopAlarm();
    };
  }, []);

  const renderSection = (level, color, icon) => {
    const isExpanded = expanded === level;
    return (
      <View style={[styles.section, { borderLeftColor: color }]}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => setExpanded(isExpanded ? null : level)}
        >
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name={icon} size={24} color={color} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>{level} SEVERITY</Text>
          </View>
          <TouchableOpacity 
            style={styles.testBtn}
            onPress={() => playTestSound(level)}
          >
            <Text style={styles.testBtnText}>🔊 Test</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            <TouchableOpacity 
              style={styles.dropdownRow}
              onPress={() => {
                setActiveLevelForSound(level);
                setIsSoundModalVisible(true);
              }}
            >
              <Text style={styles.rowLabel}>Notification Sound</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>{prefs[level].sound}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.toggleRow}>
              <Text style={styles.rowLabel}>Override DND</Text>
              <Switch 
                value={prefs[level].overrideDND} 
                onValueChange={() => togglePref(level, 'overrideDND')}
                trackColor={{ false: COLORS.surfaceContainerHigh, true: color }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.rowLabel}>Wake Screen</Text>
              <Switch 
                value={prefs[level].wakeScreen} 
                onValueChange={() => togglePref(level, 'wakeScreen')}
                trackColor={{ false: COLORS.surfaceContainerHigh, true: color }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.rowLabel}>Repeat Until Acknowledged</Text>
              <Switch 
                value={prefs[level].repeat} 
                onValueChange={() => togglePref(level, 'repeat')}
                trackColor={{ false: COLORS.surfaceContainerHigh, true: color }}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="EleGuard" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Alert Preferences</Text>
        <Text style={styles.pageSubtitle}>
          Configure how you receive intrusion detections based on severity levels.
        </Text>

        {renderSection('HIGH', COLORS.severity_HIGH, 'alert-circle')}
        {renderSection('MEDIUM', COLORS.severity_MEDIUM, 'alert-circle')}
        {renderSection('LOW', COLORS.severity_LOW, 'alert-circle-outline')}

        <View style={styles.quietHoursSection}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.rowLabel}>Enable Quiet Hours</Text>
            <Switch 
              value={prefs.quietHours?.enabled || false} 
              onValueChange={() => toggleQuietHour('enabled')}
              trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }} 
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.rowLabel}>Override for HIGH</Text>
            <Switch 
              value={prefs.quietHours?.overrideHigh || false} 
              onValueChange={() => toggleQuietHour('overrideHigh')}
              trackColor={{ false: COLORS.surfaceContainerHigh, true: COLORS.primary }} 
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={savePrefs}>
          <Text style={styles.saveBtnText}>SAVE PREFERENCES</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sound Selection Modal */}
      <Modal
        visible={isSoundModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSoundModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Alarm Sound</Text>
              <TouchableOpacity onPress={() => setIsSoundModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SOUND_OPTIONS.map((option) => (
                <TouchableOpacity 
                  key={option} 
                  style={styles.soundOption}
                  onPress={() => setSoundPref(activeLevelForSound, option)}
                >
                  <MaterialCommunityIcons 
                    name={prefs[activeLevelForSound]?.sound === option ? "radiobox-marked" : "radiobox-blank"} 
                    size={24} 
                    color={prefs[activeLevelForSound]?.sound === option ? COLORS.primary : COLORS.outline} 
                  />
                  <Text style={[styles.soundOptionText, prefs[activeLevelForSound]?.sound === option && { color: COLORS.primary }]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
    marginBottom: 8,
  },
  pageSubtitle: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    marginBottom: 32,
  },
  section: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 18,
    color: COLORS.onSurface,
  },
  testBtn: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  testBtnText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurface,
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerHigh,
  },
  dropdownValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    ...TYPOGRAPHY.bodyLG,
    color: COLORS.onSurface,
  },
  dropdownValue: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surfaceContainer,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerHigh,
    gap: 12,
  },
  soundOptionText: {
    ...TYPOGRAPHY.bodyLG,
    color: COLORS.onSurface,
  },
  quietHoursSection: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
  },
  saveBtn: {
    backgroundColor: COLORS.primaryContainer,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onPrimary,
  },
});
