// FILE: components/Header.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TYPOGRAPHY } from '../constants/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';

export default function Header({ title = "EleGuard", showBack = false, onBack, onProfilePress }) {
  const { userData } = useAuth();
  
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <MaterialCommunityIcons name="shield-check" size={28} color={COLORS.primary} />
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.rightContainer}>
          <TouchableOpacity 
            onPress={onProfilePress} 
            disabled={!onProfilePress}
            activeOpacity={0.7}
            style={styles.avatarContainer}
          >
            <Text style={styles.avatarText}>
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.slateHeader,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryContainer,
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  title: {
    ...TYPOGRAPHY.headlineMD,
    color: COLORS.primary,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.labelLG,
    color: COLORS.onPrimary,
  },
});
