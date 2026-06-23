import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Switch, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Animated, 
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ref, onValue, update, set, push, get, child, serverTimestamp } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { SENSORS } from '../constants/sensors';
import Header from '../components/Header';
import DefenseLog from '../components/DefenseLog';
import { useAuth } from '../hooks/useAuth';
import { LinearGradient } from 'expo-linear-gradient';

// LayoutAnimation is enabled by default in the New Architecture, 
// so setLayoutAnimationEnabledExperimental is no longer needed.


const { width } = Dimensions.get('window');

export default function DefendingSystemScreen({ navigation }) {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [systemState, setSystemState] = useState({
    autoDefense: true,
    status: 'STANDBY',
    intensity: 'MED',
    lastActivated: { zone: 'None', time: 'Never' }
  });
  
   const [sensorControls, setSensorControls] = useState({});
   const [sensorCounters, setSensorCounters] = useState({});
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [logs, setLogs] = useState([]);
   const [expandedSensor, setExpandedSensor] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Listen to BOTH nodes for a unified view
    const defenseRef = ref(db, 'defense_system');
    const defendingSystemRef = ref(db, 'defending_system');
    const logsRef = ref(db, 'defense_logs');

    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const unsubDefense = onValue(defenseRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSystemState(prev => ({
          ...prev,
          autoDefense: data.autoDefense ?? true,
          status: data.status ?? 'STANDBY',
          intensity: data.intensity ?? 'MED',
          lastActivated: data.lastActivated ?? { zone: 'None', time: 'Never' }
        }));
      }
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Defense System Error:", err);
      setError("Unable to connect to Defense System.");
      setLoading(false);
    });

     const unsubDefending = onValue(defendingSystemRef, (snapshot) => {
       if (snapshot.exists()) {
         const data = snapshot.val();
         const sensors = data.sensors || {};
         const counters = data.v2_counters || {};
         const controls = {};
         
         // Map the complex sensor state back to simple boolean controls for the UI
         Object.keys(sensors).forEach(id => {
           controls[id] = {
             buzzer: !!sensors[id].buzzer?.isActive,
             impulse: !!sensors[id].impulseWave?.isActive
           };
         });
         setSensorControls(controls);
         setSensorCounters(counters);
       }
       setLoading(false);
     }, (err) => {
      console.error("Defending System Sensors Error:", err);
      setLoading(false);
    });

    const unsubLogs = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const logList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).reverse();
        setLogs(logList.slice(0, 15));
      }
    }, (err) => console.error("Logs Error:", err));

    return () => {
      unsubDefense();
      unsubDefending();
      unsubLogs();
    };
  }, [isAdmin]);

  const toggleAutoDefense = async (value) => {
    if (!isAdmin) return;
    
    try {
      const updates = {};
      const timestamp = new Date().toISOString();
      
      // 1. Update primary settings nodes with multiple validation parameters
      updates['defense_system/autoDefense'] = value;
      updates['defense_system/autoDefenseMode'] = value ? 'AUTO' : 'MANUAL';
      updates['defense_system/autoDefenseEnabledByAdmin'] = value;
      updates['defense_system/lastDefenseToggle'] = timestamp;
      
      updates['defending_system/autoDefense'] = value;
      updates['defending_system/autoDefenseMode'] = value ? 'AUTO' : 'MANUAL';
      updates['defending_system/autoDefenseEnabledByAdmin'] = value;
      updates['defending_system/lastDefenseToggle'] = timestamp;
       
       // 2. AGGRESSIVE RESET: When toggling (ON or OFF), we clear ALL counters to ensure a fresh start
       Object.keys(SENSORS).forEach(id => {
         // Reset Streaks
         updates[`defending_system/alert_counters/${id}/highSeverityCount`] = 0;
         updates[`defending_system/alert_counters/${id}/lowSeverityCount`] = 0;
         updates[`defending_system/alert_counters/${id}/autoTriggered`] = false;
         
         // If turning OFF, also force-deactivate all hardware
         if (!value) {
           updates[`defending_system/sensors/${id}/buzzer/isActive`] = false;
           updates[`defending_system/sensors/${id}/impulseWave/isActive`] = false;
           updates[`defense_system/sensor_controls/${id}/buzzer`] = false;
           updates[`defense_system/sensor_controls/${id}/impulse`] = false;
         }
       });

       if (!value) {
         updates['defense_system/status'] = 'STANDBY';
       }
 
       await update(ref(db), updates);
      
      // 3. Log the change
      await push(ref(db, 'defense_logs'), {
        type: 'SYSTEM',
        zone: 'GLOBAL',
        triggerType: 'MANUAL_SETTING',
        timestamp: serverTimestamp(),
        outcome: 'SUCCESS',
        action: value ? 'AUTO_DEFENSE_ENABLED' : 'AUTO_DEFENSE_DISABLED'
      });

    } catch (err) {
      console.error("Toggle Auto Defense Error:", err);
      Alert.alert('Error', 'Failed to update auto defense: ' + err.message);
    }
  };

  const toggleSensorSetting = async (sensorId, type, value) => {
    if (!isAdmin) return;
    
    try {
      const sensor = SENSORS[sensorId];
      const timestamp = new Date().toISOString();
      const updates = {};
      
      // 1. Update the 'defense_system' node (Simple UI/Dashboard State)
      updates[`defense_system/sensor_controls/${sensorId}/${type}`] = value;
      
      // 2. Map 'impulse' to 'impulseWave' for the 'defending_system' node
      const dbType = type === 'impulse' ? 'impulseWave' : type;
      
      // 3. Update the complex 'defending_system' node (Hardware/Logic State)
      updates[`defending_system/sensors/${sensorId}/${dbType}`] = {
        isActive: value,
        [value ? 'activatedAt' : 'deactivatedAt']: timestamp,
        triggerType: 'MANUAL',
        triggeredBy: 'admin',
        intensity: systemState.intensity || 'MED',
        durationSeconds: 0
      };

      // 4. Reset alert counters if turning off
      if (!value) {
        updates[`defending_system/alert_counters/${sensorId}/highSeverityCount`] = 0;
        updates[`defending_system/alert_counters/${sensorId}/lowSeverityCount`] = 0;
        updates[`defending_system/alert_counters/${sensorId}/autoTriggered`] = false;
      }
      
      // 5. Calculate new global status
      const newControls = { ...sensorControls };
      newControls[sensorId] = { ...(newControls[sensorId] || {}), [type]: value };
      const anyActive = Object.values(newControls).some(c => c && (c.buzzer || c.impulse));
      updates['defense_system/status'] = anyActive ? 'ACTIVE' : 'STANDBY';
      
      if (value) {
        updates['defense_system/lastActivated'] = {
          zone: `${sensor.zone} (${type.toUpperCase()})`,
          time: new Date().toLocaleTimeString()
        };
      }

      // Perform atomic update across all paths
      await update(ref(db), updates);
      
      // 6. Log the action
      await push(ref(db, 'defense_logs'), {
        type: type.toUpperCase(),
        zone: sensor.zone,
        triggerType: 'MANUAL_TOGGLE',
        timestamp: serverTimestamp(),
        outcome: 'SUCCESS',
        action: value ? 'ENABLED' : 'DISABLED'
      });
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (err) {
      console.error("Toggle Error:", err);
      Alert.alert('Error', 'Failed to update: ' + err.message);
    }
  };



  const triggerManualSensorAction = async (sensorId, type, action) => {
    if (!isAdmin) return;
    
    try {
      const isActivating = action === 'START' || action === 'ACTIVATE';
      const sensor = SENSORS[sensorId];
      const timestamp = new Date().toISOString();
      const updates = {};
      
      // 1. Simple control update
      updates[`defense_system/sensor_controls/${sensorId}/${type}`] = isActivating;

      // 2. Complex state update
      const dbType = type === 'impulse' ? 'impulseWave' : type;
      updates[`defending_system/sensors/${sensorId}/${dbType}`] = {
        isActive: isActivating,
        [isActivating ? 'activatedAt' : 'deactivatedAt']: timestamp,
        triggerType: 'MANUAL_TEST',
        triggeredBy: 'admin',
        intensity: 'HIGH',
        durationSeconds: isActivating ? 30 : 0
      };

      // 3. Reset counters if stopping
      if (!isActivating) {
        updates[`defending_system/alert_counters/${sensorId}/highSeverityCount`] = 0;
        updates[`defending_system/alert_counters/${sensorId}/autoTriggered`] = false;
      }

      // 4. Global status
      const newControls = { ...sensorControls };
      newControls[sensorId] = { ...(newControls[sensorId] || {}), [type]: isActivating };
      const anyActive = Object.values(newControls).some(c => c && (c.buzzer || c.impulse));
      updates['defense_system/status'] = anyActive ? 'ACTIVE' : 'STANDBY';

      if (isActivating) {
        updates['defense_system/lastActivated'] = { 
          zone: `${sensor.zone} (${type.toUpperCase()})`, 
          time: new Date().toLocaleTimeString() 
        };
      }

      await update(ref(db), updates);

      // 5. Log
      await push(ref(db, 'defense_logs'), {
        type: type.toUpperCase(),
        zone: sensor.zone,
        triggerType: 'MANUAL_BUTTON',
        timestamp: serverTimestamp(),
        outcome: 'SUCCESS',
        action: isActivating ? 'TEST_START' : 'TEST_STOP'
      });

    } catch (error) {
      console.error("Manual Action Error:", error);
      Alert.alert('Error', 'Failed to trigger: ' + error.message);
    }
  };

  const renderSensorItem = (id) => {
    const sensor = SENSORS[id];
    const controls = sensorControls[id] || { buzzer: false, impulse: false };
    const isExpanded = expandedSensor === id;

    return (
      <View key={id} style={[
        styles.sensorCard, 
        isExpanded && styles.sensorCardExpanded,
        (controls.buzzer || controls.impulse) && styles.sensorCardActive
      ]}>
        <TouchableOpacity 
          style={styles.sensorCardHeader} 
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedSensor(isExpanded ? null : id);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.sensorInfo}>
            <View style={[
              styles.sensorIdBadge, 
              (controls.buzzer || controls.impulse) && styles.sensorIdBadgeActiveRed
            ]}>
              <Text style={styles.sensorIdText}>{id}</Text>
            </View>
            <View>
              <Text style={styles.sensorZoneText}>{sensor.zone}</Text>
              <Text style={styles.sensorStatusPreview}>
                {controls.buzzer ? '🔊 Buzzer' : ''}
                {controls.buzzer && controls.impulse ? ' · ' : ''}
                {controls.impulse ? '〰️ Impulse' : ''}
                {!controls.buzzer && !controls.impulse ? 'Deactivated' : ''}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color={COLORS.onSurfaceVariant} 
          />
        </TouchableOpacity>
 
         {isExpanded && (
           <View style={styles.sensorControlsArea}>
             {/* Streak Progress Bars */}
             <View style={styles.streakSection}>
               <Text style={styles.streakSectionTitle}>Streak Progress (Auto-Trigger Threshold)</Text>
               
               {/* High/Critical Streak Bar */}
               <View style={styles.streakItem}>
                 <View style={styles.streakHeader}>
                   <Text style={styles.streakLabel}>High/Critical Alert Streak</Text>
                   <Text style={[styles.streakCount, { color: COLORS.severity_HIGH }]}>
                     {sensorCounters[id]?.highSeverityCount || 0}/5
                   </Text>
                 </View>
                 <View style={styles.progressBarBg}>
                   <Animated.View style={[
                     styles.progressBarFill, 
                     { 
                       width: `${Math.min(100, ((sensorCounters[id]?.highSeverityCount || 0) / 5) * 100)}%`,
                       backgroundColor: COLORS.severity_HIGH 
                     }
                   ]} />
                 </View>
               </View>
 
               {/* Low/Medium Streak Bar */}
               <View style={styles.streakItem}>
                 <View style={styles.streakHeader}>
                   <Text style={styles.streakLabel}>Low/Medium Alert Streak</Text>
                   <Text style={[styles.streakCount, { color: COLORS.severity_MEDIUM }]}>
                     {sensorCounters[id]?.lowSeverityCount || 0}/10
                   </Text>
                 </View>
                 <View style={styles.progressBarBg}>
                   <Animated.View style={[
                     styles.progressBarFill, 
                     { 
                       width: `${Math.min(100, ((sensorCounters[id]?.lowSeverityCount || 0) / 10) * 100)}%`,
                       backgroundColor: COLORS.severity_MEDIUM 
                     }
                   ]} />
                 </View>
               </View>
               
               {!systemState.autoDefense && (
                 <View style={styles.autoDefenseOffBadge}>
                   <MaterialCommunityIcons name="shield-off" size={12} color="#FFA726" />
                   <Text style={styles.autoDefenseOffText}>Auto-count paused (Manual Mode)</Text>
                 </View>
               )}
             </View>
 
             {/* Buzzer Control */}
            <View style={styles.controlSection}>
              <View style={styles.controlRow}>
                <View style={styles.controlLabelContainer}>
                  <MaterialCommunityIcons name="volume-high" size={20} color={controls.buzzer ? COLORS.primary : COLORS.outline} />
                  <Text style={[styles.controlLabel, !isAdmin && { color: COLORS.outline }]}>Alarm Buzzer</Text>
                </View>
                <Switch 
                  value={controls.buzzer}
                  onValueChange={(val) => toggleSensorSetting(id, 'buzzer', val)}
                  disabled={!isAdmin}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.primary }}
                  thumbColor={controls.buzzer ? '#FFF' : '#AAA'}
                />
              </View>
              {isAdmin && (
                <View style={styles.sensorActionButtons}>
                  <TouchableOpacity 
                    style={[styles.smallActionBtn, controls.buzzer && styles.activeBtn]} 
                    onPress={() => triggerManualSensorAction(id, 'buzzer', 'START')}
                  >
                    <Text style={styles.smallActionBtnText}>START</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.smallActionBtn} 
                    onPress={() => triggerManualSensorAction(id, 'buzzer', 'STOP')}
                  >
                    <Text style={[styles.smallActionBtnText, { color: COLORS.severity_HIGH }]}>STOP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Impulse Control */}
            <View style={styles.controlSection}>
              <View style={styles.controlRow}>
                <View style={styles.controlLabelContainer}>
                  <MaterialCommunityIcons name="pulse" size={20} color={controls.impulse ? COLORS.primary : COLORS.outline} />
                  <Text style={[styles.controlLabel, !isAdmin && { color: COLORS.outline }]}>Impulse Wave</Text>
                </View>
                <Switch 
                  value={controls.impulse}
                  onValueChange={(val) => toggleSensorSetting(id, 'impulse', val)}
                  disabled={!isAdmin}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.primary }}
                  thumbColor={controls.impulse ? '#FFF' : '#AAA'}
                />
              </View>
              {isAdmin && (
                <View style={styles.sensorActionButtons}>
                  <TouchableOpacity 
                    style={[styles.smallActionBtn, controls.impulse && styles.activeBtn]} 
                    onPress={() => triggerManualSensorAction(id, 'impulse', 'START')}
                  >
                    <Text style={styles.smallActionBtnText}>START</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.smallActionBtn} 
                    onPress={() => triggerManualSensorAction(id, 'impulse', 'STOP')}
                  >
                    <Text style={[styles.smallActionBtnText, { color: COLORS.severity_HIGH }]}>STOP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
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
      <LinearGradient
        colors={['rgba(76, 175, 80, 0.15)', 'transparent']}
        style={styles.headerGradient}
      />
      
      <Header 
        title="Defense Settings" 
        showBack 
        onBack={() => navigation.goBack()} 
      />
      
      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim }}
      >
        {/* Role Badge */}
        <View style={styles.roleHeader}>
          <View style={[styles.roleBadge, isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeFarmer]}>
            <MaterialCommunityIcons 
              name={isAdmin ? "shield-crown" : "account"} 
              size={14} 
              color={isAdmin ? COLORS.primary : COLORS.outline} 
            />
            <Text style={[styles.roleBadgeText, isAdmin ? { color: COLORS.primary } : { color: COLORS.outline }]}>
              {isAdmin ? 'SYSTEM ADMINISTRATOR' : 'FIELD OPERATOR (READ-ONLY)'}
            </Text>
          </View>
        </View>

        {/* Status Overview Card */}
        <View style={styles.statusHeroCard}>
          <View style={styles.statusHeroContent}>
            <View>
              <Text style={styles.statusHeroTitle}>Global Status</Text>
              <Text style={[styles.statusHeroValue, systemState.status === 'ACTIVE' && { color: COLORS.severity_HIGH }]}>
                {systemState.status}
              </Text>
              <Text style={styles.statusHeroMeta}>
                Last Trigger: {systemState.lastActivated.zone}
              </Text>
            </View>
            <View style={[styles.statusIconContainer, systemState.status === 'ACTIVE' && styles.statusIconActive]}>
              <MaterialCommunityIcons 
                name={systemState.status === 'ACTIVE' ? "shield-alert" : "shield-check"} 
                size={32} 
                color={systemState.status === 'ACTIVE' ? '#FFF' : COLORS.primary} 
              />
            </View>
          </View>
        </View>

         <View style={styles.sectionContainer}>
           <View style={styles.sectionHeader}>
             <Text style={styles.sectionTitle}>Global System Control</Text>
             <Text style={styles.sectionSubtitle}>Master override for all automated defenses</Text>
           </View>
           
           <TouchableOpacity 
             style={[
               styles.masterControlButton, 
               systemState.autoDefense ? styles.masterButtonActive : styles.masterButtonInactive
             ]}
             onPress={() => toggleAutoDefense(!systemState.autoDefense)}
             activeOpacity={0.8}
             disabled={!isAdmin}
           >
             <View style={styles.masterButtonContent}>
               <View style={styles.masterIconContainer}>
                 <MaterialCommunityIcons 
                   name={systemState.autoDefense ? "shield-check" : "shield-off"} 
                   size={28} 
                   color="#FFF" 
                 />
               </View>
               <View style={styles.masterTextContainer}>
                 <Text style={styles.masterButtonLabel}>
                   {systemState.autoDefense ? 'AUTO DEFENSE IS ACTIVE' : 'AUTO DEFENSE IS DISABLED'}
                 </Text>
                 <Text style={styles.masterButtonActionText}>
                   {systemState.autoDefense ? 'CLICK TO DISABLE ALL SYSTEMS' : 'CLICK TO ENABLE AUTO DEFENSE'}
                 </Text>
               </View>
               <MaterialCommunityIcons 
                 name={systemState.autoDefense ? "power" : "power"} 
                 size={24} 
                 color="rgba(255,255,255,0.5)" 
               />
             </View>
           </TouchableOpacity>
         </View>

        {/* Individual Sensor Defense Control */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Individual Sensor Defense</Text>
            <Text style={styles.sectionSubtitle}>Customize defense response per zone</Text>
          </View>

          {Object.keys(SENSORS).map(id => renderSensorItem(id))}
        </View>

        {/* Logs Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity Logs</Text>
          </View>
          {logs.length === 0 ? (
            <View style={styles.emptyLogs}>
              <Text style={styles.emptyLogsText}>No recent defense activities</Text>
            </View>
          ) : (
            logs.map(log => <DefenseLog key={log.id} log={log} />)
          )}
        </View>

      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  roleHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  roleBadgeAdmin: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  roleBadgeFarmer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleBadgeText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusHeroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusHeroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusHeroTitle: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    marginBottom: 4,
  },
  statusHeroValue: {
    ...TYPOGRAPHY.headlineLG,
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 32,
  },
  statusHeroMeta: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconActive: {
    backgroundColor: COLORS.severity_HIGH,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  settingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingTextContent: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    ...TYPOGRAPHY.bodyLG,
    color: '#FFF',
    fontWeight: '600',
  },
  settingDesc: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    marginTop: 2,
  },

  sensorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  sensorCardExpanded: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sensorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sensorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sensorIdBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorIdBadgeActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  sensorIdBadgeActiveRed: {
    backgroundColor: 'rgba(255, 82, 82, 0.25)',
  },
  sensorCardActive: {
    backgroundColor: 'rgba(255, 82, 82, 0.05)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderWidth: 1.5,
  },
  sensorIdText: {
    ...TYPOGRAPHY.labelLG,
    color: '#FFF',
    fontWeight: '800',
  },
  sensorZoneText: {
    ...TYPOGRAPHY.bodyLG,
    color: '#FFF',
    fontWeight: '600',
  },
  sensorStatusPreview: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  sensorControlsArea: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  controlSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sensorActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeBtn: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: COLORS.primary,
  },
  smallActionBtnText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  controlLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlLabel: {
    ...TYPOGRAPHY.bodyMD,
    color: '#DDD',
    fontWeight: '500',
  },
  emptyLogs: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
   emptyLogsText: {
     ...TYPOGRAPHY.bodyMD,
     color: COLORS.onSurfaceVariant,
   },
   streakSection: {
     backgroundColor: 'rgba(255, 255, 255, 0.03)',
     padding: 12,
     borderRadius: 12,
     marginBottom: 8,
   },
   streakSectionTitle: {
     ...TYPOGRAPHY.labelLG,
     color: COLORS.onSurfaceVariant,
     fontSize: 10,
     marginBottom: 12,
     letterSpacing: 0.5,
   },
   streakItem: {
     marginBottom: 12,
   },
   streakHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 6,
   },
   streakLabel: {
     ...TYPOGRAPHY.bodyMD,
     fontSize: 12,
     color: '#DDD',
   },
   streakCount: {
     ...TYPOGRAPHY.labelLG,
     fontSize: 12,
     fontWeight: '800',
   },
   progressBarBg: {
     height: 6,
     backgroundColor: 'rgba(255, 255, 255, 0.05)',
     borderRadius: 3,
     overflow: 'hidden',
   },
   progressBarFill: {
     height: '100%',
     borderRadius: 3,
   },
   autoDefenseOffBadge: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 6,
     marginTop: 4,
     backgroundColor: 'rgba(255, 167, 38, 0.1)',
     paddingHorizontal: 8,
     paddingVertical: 4,
     borderRadius: 4,
     alignSelf: 'flex-start',
   },
   autoDefenseOffText: {
     ...TYPOGRAPHY.labelLG,
     fontSize: 9,
     color: '#FFA726',
     fontWeight: '600',
   },
   masterControlButton: {
     borderRadius: 20,
     padding: 20,
     borderWidth: 1.5,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.3,
     shadowRadius: 8,
     elevation: 6,
   },
   masterButtonActive: {
     backgroundColor: 'rgba(76, 175, 80, 0.15)',
     borderColor: COLORS.primary,
   },
   masterButtonInactive: {
     backgroundColor: 'rgba(255, 82, 82, 0.1)',
     borderColor: COLORS.severity_HIGH,
   },
   masterButtonContent: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 16,
   },
   masterIconContainer: {
     width: 52,
     height: 52,
     borderRadius: 14,
     backgroundColor: 'rgba(255, 255, 255, 0.1)',
     alignItems: 'center',
     justifyContent: 'center',
   },
   masterTextContainer: {
     flex: 1,
   },
   masterButtonLabel: {
     ...TYPOGRAPHY.labelLG,
     color: '#FFF',
     fontSize: 10,
     letterSpacing: 1,
     fontWeight: '700',
     marginBottom: 4,
   },
   masterButtonActionText: {
     ...TYPOGRAPHY.headlineMD,
     color: '#FFF',
     fontSize: 16,
     fontWeight: '800',
   },
 });
