import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AuthBranded } from '@/constants/authBranded';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface AuthPrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AuthPrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: AuthPrimaryButtonProps) {
  const inactive = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: inactive ? AuthBranded.primaryButtonMuted : AuthBranded.primaryButton },
      ]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  text: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
