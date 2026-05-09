// FILE: screens/ProfileScreen.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth';

const AnimatedMenuItem = ({ icon, label, onPress, delay = 0, danger = false }) => {
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, friction: 5, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnim }, { scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        style={[styles.menuItem, danger && styles.menuItemDanger]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={[styles.menuIconBg, { backgroundColor: danger ? 'rgba(255,68,68,0.1)' : 'rgba(120,220,119,0.08)' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={danger ? COLORS.severity_HIGH : COLORS.primary} />
        </View>
        <Text style={[styles.menuText, danger && styles.menuTextDanger]}>{label}</Text>
        {!danger && <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.outlineVariant} />}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ProfileScreen({ navigation }) {
  const { userData, user } = useAuth();
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [updating, setUpdating] = useState(false);

  const avatarScale = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Subtle rotation on the shield icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (userData?.name) {
      setNewName(userData.name);
    }
  }, [userData]);

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setUpdating(true);
    try {
      await update(ref(db, `users/${user.uid}`), {
        name: newName.trim()
      });
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => signOut(auth) }
    ]);
  };

  const handlePasswordReset = () => {
    Alert.alert(
      'Reset Password',
      `Send a password reset link to ${email}? you will be logged out after the reset.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Link', 
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert('Email Sent', 'Please check your inbox. You will now be logged out.');
              signOut(auth);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          } 
        }
      ]
    );
  };

  const name = userData?.name || 'User';
  const email = userData?.email || '';

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });

  return (
    <View style={styles.container}>
      <Header title="EleGuard" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, { opacity: heroOpacity, transform: [{ translateY: floatAnim }] }]}>
          <Animated.View style={[styles.avatarCircle, { transform: [{ scale: avatarScale }] }]}>
            <Text style={styles.avatarInitials}>{name.charAt(0).toUpperCase()}</Text>
          </Animated.View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => setEditModalVisible(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.email}>{email}</Text>
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="shield-account" size={14} color={COLORS.primary} />
            <Text style={styles.roleText}>{userData?.role || 'FARMER'}</Text>
          </View>
        </Animated.View>

        {/* Impact Card */}
        <Animated.View style={[styles.impactCard, { opacity: heroOpacity }]}>
          <Animated.View style={[styles.impactIconBg, { transform: [{ rotate }] }]}>
            <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.primary} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={styles.impactValue}>24 Alerts Acknowledged</Text>
            <Text style={styles.impactLabel}>Impact Summary · Active Guardian</Text>
          </View>
          <MaterialCommunityIcons name="star-circle" size={28} color={COLORS.severity_LOW} />
        </Animated.View>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          <AnimatedMenuItem
            icon="bell-outline"
            label="Notification Settings"
            onPress={() => navigation.navigate('NotificationSettings')}
            delay={150}
          />
          <View style={styles.divider} />
          <AnimatedMenuItem
            icon="lock-reset"
            label="Reset Password"
            onPress={handlePasswordReset}
            delay={220}
          />
          <View style={styles.divider} />
          <AnimatedMenuItem
            icon="shield-lock-outline"
            label="Defending System"
            onPress={() => navigation.navigate('DefendingSystem')}
            delay={290}
          />
          <View style={styles.divider} />
          <AnimatedMenuItem
            icon="information-outline"
            label="About EleGuard"
            onPress={() => {}}
            delay={360}
          />
        </View>

        {/* Dedicated Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.signOutIconBg}>
            <MaterialCommunityIcons name="logout" size={20} color="#FF5252" />
          </View>
          <Text style={styles.signOutText}>Sign Out from EleGuard</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>EleGuard v1.0.0 · Protecting Wildlife</Text>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Name</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.outline} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="account-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.outline}
                autoFocus
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, updating && styles.saveButtonDisabled]} 
              onPress={handleUpdateName}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: 'rgba(15, 32, 64, 0.5)',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(27, 94, 32, 0.3)',
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarInitials: {
    ...TYPOGRAPHY.headlineXL,
    fontSize: 36,
    color: COLORS.onPrimary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    ...TYPOGRAPHY.headlineLG,
    fontSize: 24,
    color: '#FFF',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(120, 220, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(120, 220, 119, 0.2)',
  },
  email: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(120, 220, 119, 0.1)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(120, 220, 119, 0.3)',
  },
  roleText: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    color: COLORS.primary,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(27, 94, 32, 0.4)',
    marginBottom: 16,
    gap: 14,
  },
  impactIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactValue: {
    ...TYPOGRAPHY.headlineMD,
    fontSize: 16,
    color: COLORS.onSurface,
    marginBottom: 2,
  },
  impactLabel: {
    ...TYPOGRAPHY.labelLG,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  menuCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  menuItemDanger: {
    backgroundColor: 'rgba(255, 68, 68, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.2)',
    marginBottom: 12,
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    ...TYPOGRAPHY.bodyLG,
    fontSize: 16,
    color: COLORS.onSurface,
  },
  menuTextDanger: {
    color: COLORS.severity_HIGH,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
    marginLeft: 68,
  },
  versionText: {
    ...TYPOGRAPHY.bodyMD,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.2)',
    marginTop: 12,
    marginBottom: 8,
  },
  signOutIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  signOutText: {
    ...TYPOGRAPHY.bodyLG,
    fontSize: 16,
    color: '#FF5252',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#0F2040',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(120, 220, 119, 0.3)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    ...TYPOGRAPHY.headlineMD,
    color: '#FFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyLG,
    color: '#FFF',
  },
  saveButton: {
    height: 56,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onPrimary,
  },
});
