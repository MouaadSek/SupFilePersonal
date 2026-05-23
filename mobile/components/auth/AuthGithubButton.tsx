import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AuthBranded } from '@/constants/authBranded';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface AuthGithubButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function AuthGithubButton({ onPress, disabled = false }: AuthGithubButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: AuthBranded.githubBg, opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <View style={styles.iconWrap}>
        <FontAwesome5 name="github" size={20} color="#ffffff" brand />
      </View>
      <Text style={styles.label}>Continuer avec GitHub</Text>
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
  },
  iconWrap: {
    marginRight: Spacing.md,
  },
  label: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
