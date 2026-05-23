import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthBranded } from '@/constants/authBranded';
import { FontSize, Spacing } from '@/constants/theme';

export function AuthDivider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>ou</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AuthBranded.googleBorder,
  },
  text: {
    marginHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    color: AuthBranded.textMuted,
    fontWeight: '500',
  },
});
