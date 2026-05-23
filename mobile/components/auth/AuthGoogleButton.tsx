import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AuthBranded } from '@/constants/authBranded';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

type Props = {
  disabled?: boolean;
  /** Override default stub behavior (shows “not enabled” alert). */
  onPress?: () => void;
};

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

/** Visual-only Google button (OAuth not wired — for UI / layout testing). */
export function AuthGoogleButton({ disabled = false, onPress }: Props) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    Alert.alert(
      'Google',
      'Connexion Google non activée. Utilisez e-mail et mot de passe pour tester l’application.',
    );
  };

  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <View style={styles.content}>
        <GoogleIcon />
        <Text style={styles.label}>Continuer avec Google</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: AuthBranded.googleBorder,
    backgroundColor: AuthBranded.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  label: { fontSize: FontSize.md, fontWeight: '600', color: AuthBranded.textDark },
});
