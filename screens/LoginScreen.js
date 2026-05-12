// FILE: screens/LoginScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { sendPasswordResetNotification } from '../services/emailService';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  Animated, 
  Keyboard, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Task 1 & 2: Push Notifications hook
  const { savePushTokens, expoPushToken } = usePushNotifications();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        Alert.alert(
          'Email Not Verified',
          'Please verify your email address before logging in. A new verification link has been sent to your inbox.',
          [{ text: 'OK' }]
        );
        return;
      }

      await savePushTokens({ expoToken: expoPushToken });

      // No need to manually navigate to 'Main'
      // The AppNavigator will automatically switch to the Main stack 
      // as soon as the auth state updates from signInWithEmailAndPassword.
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first to receive a reset link.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      
      // Send custom confirmation via EmailJS (using the proven fetch method)
      sendPasswordResetNotification(email, 'User');

      Alert.alert(
        'Email Sent', 
        `A password reset link has been sent to ${email}. Please check your inbox.`
      );
    } catch (error) {
      let message = 'An error occurred. Please try again.';
      if (error.code === 'auth/user-not-found') {
        message = 'No user found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      }
      Alert.alert('Reset Failed', message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.header}>
              <Animated.View style={[styles.iconCircle, { transform: [{ scale: logoScale }] }]}>  
                <MaterialCommunityIcons name="shield-lock" size={48} color={COLORS.primary} />
              </Animated.View>
              <Text style={styles.headline}>Welcome Back</Text>
              <Text style={styles.tagline}>Access your EleGuard dashboard</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={22} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={COLORS.outline}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="lock-outline" size={22} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.outline}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialCommunityIcons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color={COLORS.outline} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
                  <MaterialCommunityIcons 
                    name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"} 
                    size={22} 
                    color={rememberMe ? COLORS.primary : COLORS.outline} 
                  />
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={styles.loginButton} 
                  onPress={handleLogin}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.onPrimary} />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signupLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    zIndex: -1,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    zIndex: -1,
  },
  inner: {
    marginTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(120, 220, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  headline: {
    ...TYPOGRAPHY.headlineLG,
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  tagline: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    opacity: 0.8,
  },
  card: {
    backgroundColor: 'rgba(15, 32, 64, 0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 58,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.bodyLG,
    fontSize: 16,
    color: '#FFFFFF',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    marginLeft: 10,
  },
  forgotPassword: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loginButton: {
    height: 60,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButtonText: {
    ...TYPOGRAPHY.button,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
  },
  signupLink: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
