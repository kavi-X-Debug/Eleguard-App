// FILE: screens/SignUpScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Alert, 
  Animated, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { sendWelcomeEmail } from '../services/emailService';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState('FARMER');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const ADMIN_SECRET = 'ELEG_ADMIN_2026';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleSignUp = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Phone validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters long.');
      return;
    }

    if (role === 'ADMIN' && adminCode !== ADMIN_SECRET) {
      Alert.alert('Invalid Passcode', 'The admin secret code is incorrect.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);

      // Save user profile to database
      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        phone,
        role: role,
        createdAt: new Date().toISOString()
      });

      // Send welcome email
      await sendWelcomeEmail(email, name, role);

      // Sign out immediately to force verification check on login
      await signOut(auth);

      Alert.alert(
        'Verify Your Email',
        'A verification link has been sent to your email address. Please verify your account before logging in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.glowTop} />
          
          <Animated.View style={[styles.innerContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="shield-account" size={40} color={COLORS.primary} />
              </View>
              <Text style={styles.title}>Join EleGuard</Text>
              <Text style={styles.subtitle}>Protecting what matters most</Text>
            </View>

            <View style={styles.card}>
              {/* Name Input */}
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="account-outline" size={22} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.outline}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Email Input */}
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

              {/* Phone Input */}
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="phone-outline" size={22} color={COLORS.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (10 digits)"
                  placeholderTextColor={COLORS.outline}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Password Row */}
              <View style={styles.row}>
                <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
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
                      size={20} 
                      color={COLORS.outline} 
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm"
                    placeholderTextColor={COLORS.outline}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <MaterialCommunityIcons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={COLORS.outline} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Role Selection */}
              <View style={styles.roleContainer}>
                <TouchableOpacity 
                  style={[styles.roleBtn, role === 'FARMER' && styles.roleBtnActive]} 
                  onPress={() => setRole('FARMER')}
                >
                  <Text style={[styles.roleBtnText, role === 'FARMER' && styles.roleBtnTextActive]}>Farmer</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleBtn, role === 'ADMIN' && styles.roleBtnActive]} 
                  onPress={() => setRole('ADMIN')}
                >
                  <Text style={[styles.roleBtnText, role === 'ADMIN' && styles.roleBtnTextActive]}>Admin</Text>
                </TouchableOpacity>
              </View>

              {role === 'ADMIN' && (
                <Animated.View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={22} color={COLORS.primary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Admin Passcode"
                    placeholderTextColor={COLORS.outline}
                    value={adminCode}
                    onChangeText={setAdminCode}
                    secureTextEntry
                  />
                </Animated.View>
              )}

              {/* Submit Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={styles.submitBtn} 
                  onPress={handleSignUp}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.onPrimary} />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Login</Text>
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
    paddingBottom: 40,
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    zIndex: -1,
  },
  innerContainer: {
    marginTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(120, 220, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    ...TYPOGRAPHY.headlineLG,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
    opacity: 0.8,
  },
  card: {
    backgroundColor: 'rgba(15, 32, 64, 0.7)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
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
    color: '#FFFFFF',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  roleBtnActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
  },
  roleBtnText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
  },
  roleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitBtn: {
    height: 60,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitBtnText: {
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
  loginLink: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
