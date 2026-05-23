import React, { useCallback, useState } from 'react';
import {
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
    }, []),
  );

  const handleSubmit = async () => {
    if (!current.trim()) {
      setError('Saisissez votre mot de passe actuel.');
      return;
    }
    if (next.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (next !== confirm) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await changePassword(current.trim(), next);
    setLoading(false);
    if (!res.ok) {
      setError(res.message || 'Échec du changement de mot de passe.');
      return;
    }
    Alert.alert('Mot de passe', 'Votre mot de passe a été mis à jour.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Démo locale : aucune vérification du mot de passe actuel côté serveur. Le nouveau mot de passe doit
          faire au moins 8 caractères.
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Mot de passe actuel</Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
          Nouveau mot de passe
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          placeholder="Au moins 8 caractères"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
          Confirmer le nouveau mot de passe
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textTertiary}
        />
        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <Button
          title="Mettre à jour le mot de passe"
          onPress={() => void handleSubmit()}
          loading={loading}
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
  hint: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.lg,
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
