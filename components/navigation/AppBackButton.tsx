import React from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing } from '@/constants/theme';

const ICON_SIZE = 26;

type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Bouton retour unifié (icône + couleur d’accent) pour les en-têtes personnalisés.
 * Les écrans Stack utilisent `headerTintColor: colors.primary` pour le même rendu natif.
 */
export function AppBackButton({
  onPress,
  style,
  accessibilityLabel = 'Retour',
}: Props) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      style={({ pressed }) => [styles.root, pressed && styles.pressed, style]}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="chevron-back" size={ICON_SIZE} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.65,
  },
});
