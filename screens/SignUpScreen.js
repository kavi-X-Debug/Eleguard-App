// FILE: screens/SignUpScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
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
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('FARMER'); // Default role
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const ADMIN_SECRET = 'ELEG_ADMIN_2026';

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
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
        role: role, // Use the selected role (already validated)
        createdAt: new Date().toISOString()
      });

      // Send welcome email via Resend
      await sendWelcomeEmail(email, name);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-check" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.headline}>Create Account</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account-outline" size={24} color={COLORS.outline} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={COLORS.outline}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={24} color={COLORS.outline} style={styles.inputIcon} />
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

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfInput]}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.outline}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            <View style={[styles.inputContainer, styles.halfInput]}>
              <TextInput
                style={styles.input}
                placeholder="Confirm"
                placeholderTextColor={COLORS.outline}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleButton, role === 'FARMER' && styles.roleActive]} 
              onPress={() => setRole('FARMER')}
            >
              <Text style={[styles.roleText, role === 'FARMER' && styles.roleTextActive]}>Farmer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleButton, role === 'ADMIN' && styles.roleActive]} 
              onPress={() => setRole('ADMIN')}
            >
              <Text style={[styles.roleText, role === 'ADMIN' && styles.roleTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>

          {role === 'ADMIN' && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="shield-lock-outline" size={24} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Admin Passcode"
                placeholderTextColor={COLORS.outline}
                value={adminCode}
                onChangeText={setAdminCode}
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity 
            style={styles.signupButton} 
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.onPrimary} />
            ) : (
              <Text style={styles.signupButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
  },
  glowTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    transform: [{ scale: 1.5 }],
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    paddingTop: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(120, 220, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  headline: {
    ...TYPOGRAPHY.headlineLG,
    color: '#FFF',
  },
  card: {
    backgroundColor: '#0F2040',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1B5E20',
    padding: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.bodyLG,
    color: COLORS.onSurface,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  roleButton: {
    width: '48%',
    height: 48,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primaryContainer,
  },
  roleText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onSurfaceVariant,
  },
  roleTextActive: {
    color: COLORS.onPrimary,
  },
  signupButton: {
    height: 56,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    paddingBottom: 40,
  },
  footerText: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.onSurfaceVariant,
  },
  loginLink: {
    ...TYPOGRAPHY.bodyMD,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
