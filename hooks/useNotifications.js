// FILE: hooks/useNotifications.js
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '../firebase/config';
import { SENSORS } from '../constants/sensors';


// Configure the notification channel and categories
const ALARM_CHANNEL_ID = "alarm-notifications";
const configureNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'EleGuard Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'default',
      enableVibration: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  // Set up action categories (e.g., Stop Alarm button in tray)
  await Notifications.setNotificationCategoryAsync('alarm', [
    {
      identifier: 'stop',
      buttonTitle: 'STOP ALARM 🛑',
      options: {
        opensAppToForeground: false,
        isDestructive: true,
      },
    },
  ]);
};

import { useAuth } from './useAuth';
import AudioService from '../services/AudioService';

export const useNotifications = () => {
  const { user } = useAuth();
  const isFirstRun = useRef(true);

  useEffect(() => {
    const setupNotifications = async () => {
      console.log('--- NOTIFICATION SETUP START ---');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      console.log('Current permission status:', existingStatus);
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('Requested permission status:', finalStatus);
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get notification permissions!');
        return;
      }

      // Push token registration is now handled by usePushNotifications hook

      await configureNotificationChannel();
      console.log('--- NOTIFICATION SETUP END ---');
    };
    
    setupNotifications();

    // Listen for tray actions (like "Stop Alarm")
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const actionId = response.actionIdentifier;
      const categoryId = response.notification.request.content.categoryIdentifier;
      const isAlarmCategory = categoryId === 'alarm';
      const isStopAction = actionId === 'stop';
      const isOpenFromTray =
        actionId === Notifications.DEFAULT_ACTION_IDENTIFIER;
      if (isAlarmCategory && (isStopAction || isOpenFromTray)) {
        AudioService.stopAlarm();
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !user.emailVerified) return;

    const seenAlerts = new Set();
    const signalsRef = ref(db, 'iot_signals');
    
    const sendElephantAlert = async (sensor) => {
      try {
        const prefsStr = await AsyncStorage.getItem('notif_prefs');
        const settings = prefsStr ? JSON.parse(prefsStr) : {
          HIGH: { sound: "Critical Alarm", overrideDND: true, wakeScreen: true, repeat: true },
          MEDIUM: { sound: "Classic Alarm", overrideDND: true, wakeScreen: false, repeat: true },
          LOW: { sound: "Warning Buzzer", overrideDND: false, wakeScreen: false, repeat: true }
        };
        
        const severity = sensor.severity;
        const soundName = settings[severity]?.sound || 'Default';
        // Same repeat-until-dismiss pattern as HIGH/CRITICAL: loop until tray STOP, tap-to-open, or in-app ack.
        const shouldRepeat =
          settings[severity]?.repeat ||
          severity === 'HIGH' ||
          severity === 'CRITICAL' ||
          severity === 'MEDIUM' ||
          severity === 'LOW';

        await AudioService.playAlarm(soundName, { repeatUntilStop: shouldRepeat });

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🐘 ELEPHANT DETECTED — ${sensor.zone}`,
            body: `${sensor.severity} · Amplitude ${sensor.amplitude} · ${sensor.sensorId}`,
            data: { sensorId: sensor.sensorId, zone: sensor.zone },
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 200, 500],
            color: '#FF0000',
            sticky: true, // Make it harder to dismiss
            categoryIdentifier: 'alarm',
          },
          trigger: {
            channelId: ALARM_CHANNEL_ID,
          },
        });
      } catch (e) {
        console.error("Failed to send notification", e);
      }
    };

    const unsubscribe = onValue(signalsRef, async (snapshot) => {
      const sensors = snapshot.val() || {};
      
      // Check if this is the absolute first time the app is running data after installation
      const firstLaunchFlag = await AsyncStorage.getItem('first_launch_complete');
      const isInitialSync = isFirstRun.current && !firstLaunchFlag;

      for (const [id, sensor] of Object.entries(sensors)) {
        const alertKey = `${id}_${sensor.timestamp}`;
        
        // If it's the initial sync after installation, we mark everything as seen but don't alert
        if (isInitialSync) {
          seenAlerts.add(sensor.timestamp);
          continue;
        }

        // Normal alerting logic
        if (sensor.isActive && !sensor.falseAlarm && !seenAlerts.has(sensor.timestamp) && sensor.severity !== 'SAFE') {
          seenAlerts.add(sensor.timestamp);
          await sendElephantAlert({
            ...sensor,
            zone: SENSORS[id]?.zone || `Zone-${id}`
          });
        }
      }

      if (isFirstRun.current) {
        isFirstRun.current = false;
        if (!firstLaunchFlag) {
          await AsyncStorage.setItem('first_launch_complete', 'true');
        }
      }
    }, (error) => {
      if (error.message?.includes('permission_denied') && !user) return;
      console.error("Notification listener error:", error);
    });

    return () => {
      off(signalsRef);
      AudioService.stopAlarm();
    };
  }, [user]);
};
