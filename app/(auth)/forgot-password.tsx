import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mail } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AppBackButton } from '@/components/navigation';
import {
  AuthBrandedLayout,
  AuthTextField,
  AuthPrimaryButton,
} from '@/components/auth';
import { AuthBranded } from '@/constants/authBranded';
import { FontSize, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api/client';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setError("L'email est requis");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email invalide');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);
      setSent(true);
      if (__DEV__ && res.dev_reset_token) {
        Alert.alert(
          'Mode développement',
          `Jeton de réinitialisation (logs serveur) :\n${res.dev_reset_token}`,
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar style="light" />
      <AppBackButton style={[styles.backFab, { top: insets.top + Spacing.sm }]} />

      <AuthBrandedLayout
        showLogo={false}
        heroTitle="Mot de passe oublié"
        heroSubtitle="Saisissez votre e-mail pour recevoir les instructions de réinitialisation."
        cardTitle="Réinitialisation"
        belowCard={
          <TouchableOpacity onPress={() => router.back()} style={styles.backLinkWrap}>
            <Text style={styles.backLink}>Retour à la connexion</Text>
          </TouchableOpacity>
        }
      >
        {sent ? (
          <View style={styles.successBox}>
            <View style={styles.iconCircle}>
              <Mail size={28} color={AuthBranded.primaryButton} />
            </View>
            <Text style={styles.successTitle}>E-mail envoyé</Text>
            <Text style={styles.successBody}>
              Si un compte existe pour cette adresse, vous recevrez un lien de réinitialisation sous
              peu. Vérifiez aussi vos courriers indésirables.
            </Text>
            <AuthPrimaryButton
              title="Retour à la connexion"
              onPress={() => router.back()}
            />
          </View>
        ) : (
          <>
            <AuthTextField
              placeholder="Votre e-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={error ?? undefined}
              icon={<Mail size={20} color={AuthBranded.textMuted} />}
            />
            <AuthPrimaryButton
              title="Envoyer le lien"
              onPress={() => void handleSubmit()}
              loading={loading}
            />
          </>
        )}
      </AuthBrandedLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AuthBranded.cardBackground,
  },
  backFab: {
    position: 'absolute',
    left: Spacing.lg,
    zIndex: 20,
  },
  backLinkWrap: {
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.lg,
  },
  backLink: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: AuthBranded.link,
  },
  successBox: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AuthBranded.fieldBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: AuthBranded.textDark,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  successBody: {
    fontSize: FontSize.md,
    lineHeight: 22,
    color: AuthBranded.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
