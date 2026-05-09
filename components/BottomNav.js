// FILE: components/BottomNav.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

// This is a placeholder as Bottom Tabs is handled by React Navigation
export default function BottomNav() {
  return (
    <View style={styles.container}>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: COLORS.slateHeader,
    borderTopWidth: 1,
    borderTopColor: COLORS.slateBorder,
  },
});
