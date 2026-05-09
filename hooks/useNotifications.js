// FILE: hooks/useNotifications.js
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebase/config';
import { SENSORS } from '../constants/sensors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

import { useAuth } from './useAuth';
import AudioService from '../services/AudioService';

export const useNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    if (!user) return;

    const seenAlerts = new Set();
    const signalsRef = ref(db, 'iot_signals');
    
    const sendElephantAlert = async (sensor) => {
      try {
        const prefsStr = await AsyncStorage.getItem('notif_prefs');
        const settings = prefsStr ? JSON.parse(prefsStr) : {
          HIGH: { sound: "Critical Alarm", overrideDND: true, wakeScreen: true, repeat: true },
          MEDIUM: { sound: "Classic Alarm", overrideDND: true, wakeScreen: false, repeat: false },
          LOW: { sound: "Warning Buzzer", overrideDND: false, wakeScreen: false, repeat: false }
        };
        
        const severity = sensor.severity;
        const soundName = settings[severity]?.sound || 'Default';
        const shouldRepeat = settings[severity]?.repeat || severity === 'HIGH' || severity === 'CRITICAL';

        // Automatically play the alarm
        await AudioService.playAlarm(soundName, shouldRepeat);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🐘 ELEPHANT DETECTED — ${sensor.zone}`,
            body: `${sensor.severity} · Amplitude ${sensor.amplitude} · ${sensor.sensorId}`,
            sound: 'default', // Mobile OS default for the tray
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 200, 100, 200, 100, 500, 100, 500],
            color: '#FF4444',
          },
          trigger: null,
        });
      } catch (e) {
        console.error("Failed to send notification", e);
      }
    };

    const unsubscribe = onValue(signalsRef, async (snapshot) => {
      const sensors = snapshot.val() || {};
      for (const [id, sensor] of Object.entries(sensors)) {
        // Trigger alert for any non-SAFE active alert
        if (sensor.isActive && !sensor.falseAlarm && !seenAlerts.has(sensor.timestamp) && sensor.severity !== 'SAFE') {
          seenAlerts.add(sensor.timestamp);
          await sendElephantAlert({
            ...sensor,
            zone: SENSORS[id]?.zone || `Zone-${id}`
          });
        }
      }
    }, (error) => {
      if (error.message?.includes('permission_denied') && !user) return;
      console.error("Notification listener error:", error);
    });

    return () => off(signalsRef);
  }, [user]);
};
