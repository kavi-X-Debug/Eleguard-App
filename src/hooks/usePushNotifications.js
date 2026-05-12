import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { ref, update } from 'firebase/database'
import { auth, db } from '../../firebase/config'
import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

/**
 * Hook to manage push notification permissions and tokens.
 * Saves Expo push token + native FCM token (Android) for Cloud Functions / Admin SDK.
 */
export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState(null);

  /**
   * Saves push tokens to Realtime Database: users/{uid}/pushToken, fcmToken (Android).
   */
  const savePushTokens = async ({ expoToken, fcmToken } = {}) => {
    const user = auth.currentUser;

    if (!user) {
      console.log('Push Token: No user logged in, skipping save.');
      return;
    }

    try {
      const uid = user.uid;
      let fcm = fcmToken;
      if (!fcm && Platform.OS === 'android') {
        try {
          const device = await Notifications.getDevicePushTokenAsync();
          const raw = device?.data;
          fcm = typeof raw === 'string' ? raw : raw?.token;
        } catch (e) {
          console.log('savePushTokens getDevicePushTokenAsync:', e);
        }
      }

      const payload = {
        tokenUpdatedAt: new Date().toISOString(),
      };
      if (expoToken) payload.pushToken = expoToken;
      if (fcm) payload.fcmToken = fcm;

      await update(ref(db, `users/${uid}`), payload);

      console.log('✅ Push tokens saved (Expo + optional FCM)');
      console.log('✅ Saved under uid:', uid);
    } catch (error) {
      console.log('Error saving push tokens to Firebase:', error);
    }
  };

  /**
   * Requests permissions and retrieves the Expo Push Token.
   */
  const registerForPushNotificationsAsync = async () => {
    let token;

    // Request notification permissions on mount
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const easProjectId = Constants.expoConfig?.extra?.eas?.projectId
      if (!easProjectId) {
        console.warn('Missing extra.eas.projectId in app.json — Expo push token unavailable.')
        return
      }
      token = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data
      setExpoPushToken(token);

      /** Native FCM registration token (Android) — used by Firebase Admin `messaging().send()`. */
      let fcmToken;
      if (Platform.OS === 'android') {
        try {
          const device = await Notifications.getDevicePushTokenAsync()
          const raw = device?.data
          fcmToken = typeof raw === 'string' ? raw : raw?.token
        } catch (e) {
          console.log('getDevicePushTokenAsync (FCM):', e)
        }
      }

      await savePushTokens({ expoToken: token, fcmToken })
    } catch (error) {
      console.log('Error getting push token:', error);
    }

    return token;
  };

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return { expoPushToken, savePushTokens };
};
