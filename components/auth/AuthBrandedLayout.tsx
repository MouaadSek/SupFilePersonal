import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBranded } from '@/constants/authBranded';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

const LOGO = require('../../assets/images/logo-supfile.png');

const { height: SCREEN_H } = Dimensions.get('window');
const HEADER_HEIGHT = Math.min(Math.max(SCREEN_H * 0.28, 180), 240);

interface AuthBrandedLayoutProps {
  heroTitle: string;
  heroSubtitle: string;
  cardTitle: string;
  children: React.ReactNode;
  /** Rendu en bas de la carte blanche (ex. lien inscription). */
  belowCard?: React.ReactNode;
  showLogo?: boolean;
}

function HeaderWaves() {
  return (
    <View style={styles.waves} pointerEvents="none">
      <View style={[styles.waveBlob, styles.wave1]} />
      <View style={[styles.waveBlob, styles.wave2]} />
      <View style={[styles.waveBlob, styles.wave3]} />
    </View>
  );
}

export function AuthBrandedLayout({
  heroTitle,
  heroSubtitle,
  cardTitle,
  children,
  belowCard,
  showLogo = true,
}: AuthBrandedLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.column}>
          <LinearGradient
            colors={[AuthBranded.headerGradientTop, AuthBranded.headerGradientBottom]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { height: HEADER_HEIGHT, paddingTop: insets.top + Spacing.md }]}
          >
            <HeaderWaves />
            <View style={styles.headerContent}>
              {showLogo ? (
                <View style={styles.logoPill}>
                  <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                </View>
              ) : null}
              <Text style={[styles.heroTitle, !showLogo && styles.heroTitleNoLogo]}>
                {heroTitle}
              </Text>
              <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
            </View>
          </LinearGradient>

          <View
            style={[
              styles.card,
              {
                marginTop: -Spacing.xxxl,
                paddingBottom: Math.max(insets.bottom, Spacing.xl),
              },
            ]}
          >
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.cardScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.cardTitle}>{cardTitle}</Text>
              {children}
              {belowCard ? <View style={styles.below}>{belowCard}</View> : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AuthBranded.cardBackground,
  },
  flex: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl + Spacing.lg,
    overflow: 'hidden',
  },
  waves: {
    ...StyleSheet.absoluteFillObject,
  },
  waveBlob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: AuthBranded.waveLight,
  },
  wave1: {
    width: 220,
    height: 220,
    right: -60,
    bottom: -40,
    backgroundColor: AuthBranded.waveSoft,
  },
  wave2: {
    width: 160,
    height: 160,
    left: -50,
    top: 40,
    backgroundColor: AuthBranded.waveLight,
  },
  wave3: {
    width: 120,
    height: 120,
    right: 40,
    top: 80,
    backgroundColor: AuthBranded.waveSoft,
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoPill: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 168,
    height: 52,
  },
  heroTitle: {
    fontSize: FontSize.display,
    fontWeight: '800',
    color: AuthBranded.titleOnHeader,
    textAlign: 'center',
  },
  heroTitleNoLogo: {
    marginTop: Spacing.md,
  },
  heroSubtitle: {
    marginTop: Spacing.sm,
    fontSize: FontSize.md,
    lineHeight: 22,
    color: AuthBranded.subtitleOnHeader,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    maxWidth: 340,
  },
  card: {
    flex: 1,
    backgroundColor: AuthBranded.cardBackground,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  cardScroll: {
    flexGrow: 1,
  },
  cardTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: AuthBranded.cardTitle,
    marginBottom: Spacing.xl,
  },
  below: {
    marginTop: 'auto',
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
});
