import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { FontSize, Spacing } from '@/constants/theme';

const GITHUB_MARK_BG = '#24292f';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  /** Marque GitHub officielle (ex. connexion GitHub uniquement) */
  githubMark?: boolean;
}

export function Logo({ size = 'md', showText = true, githubMark = false }: LogoProps) {
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
  const markBg = githubMark ? GITHUB_MARK_BG : colors.primary;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            width: iconSize,
            height: iconSize,
            backgroundColor: markBg,
            borderRadius: iconSize * 0.25,
          },
        ]}
      >
        {githubMark ? (
          <FontAwesome5
            name="github"
            size={Math.round(iconSize * 0.52)}
            color="#ffffff"
            brand
          />
        ) : (
          <Text style={[styles.iconText, { fontSize: iconSize * 0.5 }]}>S</Text>
        )}
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
