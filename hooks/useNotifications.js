import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, onValue, off, update, get, serverTimestamp } from 'firebase/database';
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
  const seenAlerts = useRef(new Set());

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
      // 1. MASTER LOCK: Fetch Global Defense System Parameters FIRST
      const defenseSnap = await get(ref(db, 'defense_system'));
      const defenseData = defenseSnap.val() || {};
      
      const isAuth1_Enabled = defenseData.autoDefense === true;
      const isAuth2_Mode = defenseData.autoDefenseMode === 'AUTO';
      const isAuth3_Admin = defenseData.autoDefenseEnabledByAdmin === true;

      // COMPLETELY SILENT IF DISABLED: Hard exit before any other logic
      if (!isAuth1_Enabled) {
        AudioService.stopAlarm();
        return;
      }

      const signals = snapshot.val() || {};
      const firstLaunchFlag = await AsyncStorage.getItem('first_launch_complete');
      const isInitialSync = isFirstRun.current && !firstLaunchFlag;

      // TRIPLE AUTHENTICATION: All three requirements must be satisfied for any further logic
      const isSystemFullyAuthorized = isAuth1_Enabled && isAuth2_Mode && isAuth3_Admin;
      const lastToggleTime = defenseData.lastDefenseToggle ? new Date(defenseData.lastDefenseToggle).getTime() : 0;

      for (const [id, sensor] of Object.entries(signals)) {
        const severity = (sensor.severity || '').toString().toUpperCase();
        const isSafe = severity === 'SAFE';
        const isTrigger = sensor.isActive && !sensor.falseAlarm && !isSafe;
        
        // --- EXTREME FRESHNESS CHECK ---
        const alertTime = sensor.timestamp ? new Date(sensor.timestamp).getTime() : 0;
        const nowTime = Date.now();
        const isWithinWindow = (nowTime - alertTime) < 60000; 
        const isAfterToggle = alertTime > lastToggleTime;
        const isFreshAlert = isWithinWindow && isAfterToggle;

        // --- 1. HANDLE ALARMS & NOTIFICATIONS ---
        if (isTrigger && !seenAlerts.current.has(sensor.timestamp)) {
          seenAlerts.current.add(sensor.timestamp);
          
          // Trigger local feedback only if system is authorized and alert is fresh
          if (isSystemFullyAuthorized && isFreshAlert && !isInitialSync) {
            AudioService.playAlarm();
            sendElephantAlert({
              ...sensor,
              zone: SENSORS[id]?.zone || `Zone-${id}`
            });
          }
        } else if (isSafe || isInitialSync) {
          seenAlerts.current.add(sensor.timestamp);
          AudioService.stopAlarm();
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
