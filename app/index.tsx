import React, { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Redirect } from 'expo-router';
import { OnboardingFlow } from '@/components/onboarding';

const LOGO = require('../assets/images/logo-supfile.png');

const SPLASH_BG = '#ffffff';

export default function Index() {
  const [phase, setPhase] = useState<'splash' | 'onboarding' | 'ready'>('splash');
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 70,
      useNativeDriver: true,
    }).start();

    let cancelled = false;
    const run = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.94, duration: 450, useNativeDriver: true }),
      ]).start(async () => {
        if (cancelled) return;
        await SplashScreen.hideAsync().catch(() => {});
        if (cancelled) return;
        setPhase('onboarding');
      });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === 'ready') {
    return <Redirect href="/(auth)/login" />;
  }

  if (phase === 'onboarding') {
    return <OnboardingFlow onComplete={() => setPhase('ready')} />;
  }

  return (
    <View style={[styles.splashRoot, { backgroundColor: SPLASH_BG }]}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 220,
  },
});
