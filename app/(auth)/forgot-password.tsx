import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AppBackButton } from '@/components/navigation';
import { Button, Logo } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppBackButton />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoWrap}>
          <Logo size="md" />
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
            <Mail size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Mot de passe oublié</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            La réinitialisation par e-mail n’est pas encore disponible sur cette version. Modifiez
            votre mot de passe depuis l’application si vous êtes connecté, ou contactez
            l’administrateur de votre espace.
          </Text>
          <Button
            title="Retour à la connexion"
            onPress={() => router.back()}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? Spacing.md : 0,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
  },
});
