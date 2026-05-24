import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing } from '@/constants/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const { colors } = useTheme();

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 64;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return FontSize.lg;
      case 'lg':
        return FontSize.display;
      default:
        return FontSize.xxl;
    }
  };

  const iconSize = getSize();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            width: iconSize,
            height: iconSize,
            backgroundColor: colors.primary,
            borderRadius: iconSize * 0.25,
          },
        ]}
      >
        <Text style={[styles.iconText, { fontSize: iconSize * 0.5 }]}>S</Text>
      </View>
      {showText && (
        <Text style={[styles.text, { color: colors.text, fontSize: getFontSize() }]}>
          SUPFILE
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  text: {
    fontWeight: '700',
    marginLeft: Spacing.sm,
    letterSpacing: 1,
  },
});
