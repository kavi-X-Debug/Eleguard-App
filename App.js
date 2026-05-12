// FILE: App.js
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { 
  SpaceGrotesk_400Regular, 
  SpaceGrotesk_600SemiBold, 
  SpaceGrotesk_700Bold 
} from '@expo-google-fonts/space-grotesk';
import { 
  Lexend_400Regular, 
  Lexend_500Medium, 
  Lexend_600SemiBold 
} from '@expo-google-fonts/lexend';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { COLORS } from './constants/colors';
import { useNotifications } from './hooks/useNotifications';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import PermissionGuard from './components/PermissionGuard';
import { activateKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createNavigationContainerRef } from '@react-navigation/native';

// Navigation ref for notification-triggered navigation
export const navigationRef = createNavigationContainerRef();

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
  });

  // Setup notification listeners
  useNotifications();
  usePushNotifications();

  // Task 3: Set notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    })
  });

  useEffect(() => {
    activateKeepAwake();

    // Task 3: Create Android notification channel
    const createChannel = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('elephant_alerts', {
          id: 'elephant_alerts',
          name: 'Elephant Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF4444',
        });
      }
    };
    createChannel();

    // Task 3: Add notification response listener
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // When user taps a notification, navigate to Heatmap screen automatically
      if (navigationRef.isReady()) {
        // 'Heatmap' is the name of the screen in MainTabNavigator
        navigationRef.navigate('Main', { screen: 'Heatmap' });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <PermissionGuard>
        <AppNavigator navigationRef={navigationRef} />
      </PermissionGuard>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
