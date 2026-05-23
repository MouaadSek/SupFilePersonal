import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  ListRenderItemInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Cloud, Share2, Eye, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '@/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Slide = {
  key: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  gradient: readonly [string, string];
};

const SLIDES: Slide[] = [
  {
    key: '1',
    icon: Cloud,
    title: 'Votre espace cloud',
    subtitle:
      'Importez, classez et retrouvez tous vos fichiers au même endroit — photos, documents et dossiers synchronisés.',
    gradient: ['#0ea5e9', '#0369a1'] as const,
  },
  {
    key: '2',
    icon: Share2,
    title: 'Partagez en toute simplicité',
    subtitle:
      'Liens publics, partages ciblés et collaboration : gardez le contrôle sur qui accède à quoi.',
    gradient: ['#6366f1', '#4338ca'] as const,
  },
  {
    key: '3',
    icon: Eye,
    title: 'Aperçu instantané',
    subtitle:
      'Ouvrez PDF, images, feuilles et bien plus encore directement dans l’app, sans téléchargement obligatoire.',
    gradient: ['#0891b2', '#0e7490'] as const,
  },
];

type Props = {
  onComplete: () => void;
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function OnboardingFlow({ onComplete }: Props) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 480,
      useNativeDriver: true,
    }).start();
  }, [screenOpacity]);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToOffset({ offset: SCREEN_W * (index + 1), animated: true });
    } else {
      void finish();
    }
  }, [index, finish]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.min(SLIDES.length - 1, Math.max(0, Math.round(x / SCREEN_W)));
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIndex(i);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Slide>) => {
      const Icon = item.icon;
      return (
        <View style={[styles.page, { width: SCREEN_W }]}>
          <LinearGradient colors={[...item.gradient]} style={styles.pageGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.iconBubble}>
              <Icon size={56} color="#ffffff" strokeWidth={1.8} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </LinearGradient>
        </View>
      );
    },
    [],
  );

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => void finish()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Passer">
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Passer</Text>
          </Pressable>
        </View>

        <View style={styles.listWrap}>
          <FlatList
            ref={listRef}
            data={SLIDES}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            decelerationRate="fast"
            getItemLayout={(_, i) => ({
              length: SCREEN_W,
              offset: SCREEN_W * i,
              index: i,
            })}
            style={styles.list}
          />
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  {
                    width: i === index ? 22 : 8,
                    backgroundColor: i === index ? colors.primary : colors.border,
                  },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={index === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}
          >
            <Text style={styles.ctaText}>{index === SLIDES.length - 1 ? 'Commencer' : 'Suivant'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  skip: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  listWrap: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  page: {
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  pageGradient: {
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Math.min(420, SCREEN_H * 0.48),
  },
  iconBubble: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  cta: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
  },
  ctaText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
