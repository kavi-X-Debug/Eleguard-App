// FILE: screens/SplashScreen.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, ImageBackground } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { useAuth } from '../hooks/useAuth';

export default function SplashScreen({ navigation }) {
  const { user, loading } = useAuth();
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [timerDone, setTimerDone] = useState(false);

  // Start animations once
  useEffect(() => {
    const createPulse = (anim, delay) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ])
      ).start();
    };

    createPulse(pulseAnim1, 0);
    createPulse(pulseAnim2, 400);
    createPulse(pulseAnim3, 800);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      setTimerDone(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Navigate only when BOTH timer is done AND auth loading is finished
  useEffect(() => {
    if (timerDone && !loading) {
      if (user) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    }
  }, [timerDone, loading, user, navigation]);

  const renderRing = (anim) => (
    <Animated.View
      style={[
        styles.ring,
        {
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 3],
              }),
            },
          ],
          opacity: anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.8, 0.3, 0],
          }),
        },
      ]}
    />
  );

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1558260714-3d964f58c70e?q=80&w=1000' }}
      style={styles.background}
      imageStyle={{ opacity: 0.2, tintColor: 'gray' }}
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          {renderRing(pulseAnim1)}
          {renderRing(pulseAnim2)}
          {renderRing(pulseAnim3)}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-check" size={60} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>ELEGUARD</Text>
        <Text style={styles.tagline}>Protecting Wildlife & Communities</Text>

        <View style={styles.progressContainer}>
          <Text style={styles.loadingText}>INITIALIZING...</Text>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0e141a',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: 120,
    height: 120,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(120, 220, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    ...TYPOGRAPHY.headlineXL,
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 16,
  },
  tagline: {
    ...TYPOGRAPHY.bodyLG,
    color: COLORS.primary,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
    marginBottom: 12,
    letterSpacing: 1,
  },
  progressBarBg: {
    width: '80%',
    height: 4,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});
