import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mail, Lock, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  AuthBrandedLayout,
  AuthTextField,
  AuthPrimaryButton,
} from '@/components/auth';
import { AuthBranded } from '@/constants/authBranded';
import { FontSize, Spacing } from '@/constants/theme';
import { ApiError } from '@/services/api/client';

export default function LoginScreen() {
  const { login, isLoading, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const validateForm = () => {
    const newErrors: typeof errors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setErrors({});
    try {
      await login(email, password, rememberMe);
      router.replace('/(tabs)');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Connexion impossible. Vérifiez vos identifiants.';
      setErrors({ form: message });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar style="light" />
      <AuthBrandedLayout
        showLogo={false}
        heroTitle="Bonjour !"
        heroSubtitle="Connectez-vous en toute sécurité avec votre e-mail et votre mot de passe."
        cardTitle="Connexion"
        belowCard={
          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>S&apos;inscrire</Text>
            </TouchableOpacity>
          </View>
        }
      >
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
          placeholder="Votre mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
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
          title="Se connecter"
          onPress={() => void handleLogin()}
          loading={isLoading}
        />
      </AuthBrandedLayout>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AuthBranded.cardBackground,
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
