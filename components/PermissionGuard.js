import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';

export default function PermissionGuard({ children }) {
  const [permissions, setPermissions] = useState({
    notifications: true,
    battery: true,
    overlay: true,
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS !== 'android') return;

    const { status } = await Notifications.getPermissionsAsync();
    const isBatteryOptimized = false; // We can't easily check this without a native module, but we can prompt anyway
    
    // In a real app, you'd use a native module like react-native-battery-optimization-check
    // For now, we'll assume we need to prompt the user to be safe
    
    setPermissions({
      notifications: status === 'granted',
      battery: true, // Placeholder
      overlay: true, // Placeholder
    });

    if (status !== 'granted') {
      setShowModal(true);
    }
  };

  const requestNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      checkPermissions();
    } else {
      Linking.openSettings();
    }
  };

  const requestBatteryOptimization = () => {
    if (Platform.OS === 'android') {
      IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
    }
  };

  const requestOverlay = () => {
    if (Platform.OS === 'android') {
      IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION, {
        data: `package:com.eleguard.app`,
      });
    }
  };

  if (!showModal) return children;

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <MaterialCommunityIcons name="shield-check" size={64} color={COLORS.primary} />
            <Text style={styles.title}>Essential Permissions</Text>
            <Text style={styles.subtitle}>
              To ensure EleGuard can protect you in the background and sound alarms, please enable the following:
            </Text>

            <TouchableOpacity style={styles.item} onPress={requestNotifications}>
              <MaterialCommunityIcons name="bell-ring" size={24} color={permissions.notifications ? COLORS.success : COLORS.primary} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Notifications</Text>
                <Text style={styles.itemDesc}>To show alerts and play sound</Text>
              </View>
              {permissions.notifications && <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />}
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={requestBatteryOptimization}>
              <MaterialCommunityIcons name="battery-off" size={24} color={COLORS.primary} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Disable Battery Optimization</Text>
                <Text style={styles.itemDesc}>Prevents Android from killing the app</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={requestOverlay}>
              <MaterialCommunityIcons name="layers" size={24} color={COLORS.primary} />
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>Draw Over Other Apps</Text>
                <Text style={styles.itemDesc}>Shows alerts even when phone is locked</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtnText}>I'VE ENABLED THEM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
  },
  itemText: {
    flex: 1,
    marginLeft: 16,
  },
  itemTitle: {
    ...TYPOGRAPHY.labelLG,
    color: '#FFF',
  },
  itemDesc: {
    ...TYPOGRAPHY.bodySM,
    color: COLORS.onSurfaceVariant,
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  closeBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onPrimary,
  },
});
