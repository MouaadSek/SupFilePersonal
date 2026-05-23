import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setError(null);
    }, [user?.name, user?.email]),
  );

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName) {
      setError('Le nom ne peut pas être vide.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setError('Adresse e-mail invalide.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: trimmedName, email: trimmedEmail });
      router.back();
    } catch {
      setError('Enregistrement impossible. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.textSecondary }]}>Nom affiché</Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          value={name}
          onChangeText={setName}
          placeholder="Votre nom"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
        />
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>E-mail</Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="vous@exemple.com"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <Button
          title="Enregistrer"
          onPress={() => void handleSave()}
          loading={saving}
          fullWidth
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: FontSize.md,
  },
  error: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
});
