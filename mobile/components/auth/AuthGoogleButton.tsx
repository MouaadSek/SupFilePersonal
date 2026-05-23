import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AuthBranded } from '@/constants/authBranded';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface AuthGoogleButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function AuthGoogleButton({ onPress, disabled = false }: AuthGoogleButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[styles.btn, disabled && styles.btnDisabled]}
    >
      <View style={styles.iconWrap}>
        <FontAwesome5 name="google" size={18} color="#4285F4" />
      </View>
      <Text style={styles.label}>Continuer avec Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: AuthBranded.fieldBorder,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    marginRight: Spacing.md,
  },
  label: {
    color: AuthBranded.textDark,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
