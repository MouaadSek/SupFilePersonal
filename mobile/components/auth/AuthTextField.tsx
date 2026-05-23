import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { AuthBranded } from '@/constants/authBranded';
import { BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface AuthTextFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  error?: string;
}

export function AuthTextField({
  placeholder,
  value,
  onChangeText,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
}: AuthTextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? AuthBranded.error
    : focused
      ? AuthBranded.fieldBorderFocused
      : AuthBranded.fieldBorder;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.row,
          { backgroundColor: AuthBranded.fieldBackground, borderColor },
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          style={[styles.input, { color: AuthBranded.textDark }]}
          placeholder={placeholder}
          placeholderTextColor={AuthBranded.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            style={styles.eye}
            hitSlop={8}
          >
            {showPassword ? (
              <EyeOff size={20} color={AuthBranded.textMuted} />
            ) : (
              <Eye size={20} color={AuthBranded.textMuted} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
  },
  eye: {
    padding: Spacing.xs,
  },
  error: {
    fontSize: FontSize.sm,
    color: AuthBranded.error,
    marginTop: Spacing.xs,
  },
});
