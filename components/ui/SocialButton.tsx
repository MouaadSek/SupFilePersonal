import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

/** Couleur officielle GitHub (marque sur fond sombre). */
const GITHUB_MARK_BG = '#24292f';

interface SocialButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function SocialButton({ onPress, disabled = false }: SocialButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: GITHUB_MARK_BG }]}>
        <FontAwesome5 name="github" size={18} color="#ffffff" brand />
      </View>
      <Text style={[styles.text, { color: colors.text }]}>Continuer avec GitHub</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});
