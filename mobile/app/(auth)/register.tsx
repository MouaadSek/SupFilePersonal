import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mail, Lock, User, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AppBackButton } from '@/components/navigation';
import {
  AuthBrandedLayout,
  AuthTextField,
  AuthPrimaryButton,
  AuthGoogleButton,
  AuthDivider,
} from '@/components/auth';
import { AuthBranded } from '@/constants/authBranded';
import { FontSize, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api/client';

export default function RegisterScreen() {
  const { register, isLoading, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!email) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      newErrors.password = 'Au moins 8 caractères';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmez le mot de passe';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    setErrors({});
    try {
      await register(email, password, name.trim(), rememberMe);
      router.replace('/(tabs)');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Inscription impossible. Réessayez.';
      setErrors({ form: message });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar style="light" />
      <AppBackButton
        style={[styles.backFab, { top: insets.top + Spacing.sm }]}
      />

      <AuthBrandedLayout
        showLogo={false}
        heroTitle="Créer un compte"
        heroSubtitle="Inscrivez-vous avec une adresse e-mail et un mot de passe valides."
        cardTitle="Inscription"
        belowCard={
          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <AuthTextField
          placeholder="Nom complet"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={errors.name}
          icon={<User size={20} color={AuthBranded.textMuted} />}
        />

        <AuthTextField
          placeholder="Votre e-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
          icon={<Mail size={20} color={AuthBranded.textMuted} />}
        />

        <AuthTextField
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
          icon={<Lock size={20} color={AuthBranded.textMuted} />}
        />

        <AuthTextField
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={errors.confirmPassword}
          icon={<Lock size={20} color={AuthBranded.textMuted} />}
        />

        <View style={styles.rowBetween}>
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(v => !v)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: rememberMe
                    ? AuthBranded.primaryButton
                    : AuthBranded.fieldBorder,
                  backgroundColor: rememberMe
                    ? AuthBranded.primaryButton
                    : 'transparent',
                },
              ]}
            >
              {rememberMe ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}
            </View>
            <Text style={styles.rememberLabel}>Se souvenir de moi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={8}
          >
            <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        </View>

        {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

        <AuthPrimaryButton
          title="Créer mon compte"
          onPress={() => void handleRegister()}
          loading={isLoading}
        />

        <AuthDivider />

        <AuthGoogleButton disabled={isLoading} />

        <Text style={styles.terms}>
          En vous inscrivant, vous acceptez nos{' '}
          <Text style={styles.termsLink}>conditions d&apos;utilisation</Text> et notre{' '}
          <Text style={styles.termsLink}>politique de confidentialité</Text>.
        </Text>
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: Spacing.sm,
    marginBottom: Spacing.lg,
    marginTop: -Spacing.xs,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberLabel: {
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: AuthBranded.textDark,
  },
  forgotLink: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: AuthBranded.link,
    marginLeft: Spacing.sm,
  },
  formError: {
    color: AuthBranded.error,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  terms: {
    fontSize: FontSize.sm,
    color: AuthBranded.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.lg,
  },
  termsLink: {
    color: AuthBranded.link,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.lg,
  },
  footerMuted: {
    fontSize: FontSize.md,
    color: AuthBranded.textMuted,
  },
  footerLink: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: AuthBranded.link,
  },
});
