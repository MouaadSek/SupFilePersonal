import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  sheetStyle?: ViewStyle;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  sheetStyle,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const [mounted, setMounted] = useState(visible);
  const backdrop = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(48)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdrop.setValue(0);
      slide.setValue(48);
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          useNativeDriver: true,
          speed: 16,
          bounciness: 3,
        }),
      ]).start();
      return;
    }

    if (!mounted) return;

    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 48,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, backdrop, slide]);

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, transform: [{ translateY: slide }] },
            sheetStyle,
          ]}
        >
          {title ? (
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
    maxHeight: '78%',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
});
