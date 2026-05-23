import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { fileExtensionLabel, effectiveMimeTypeForFile } from '@/utils/mimeFromFilename';
import { BorderRadius } from '@/constants/theme';
import { getFileColor } from '@/data/mockData';
import type { FileItem } from '@/types';

type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { box: number; font: number }> = {
  sm: { box: 44, font: 10 },
  md: { box: 72, font: 13 },
  lg: { box: 88, font: 15 },
};

type FileExtensionBadgeProps = {
  file: FileItem;
  size?: Size;
  style?: StyleProp<ViewStyle>;
};

/** Pastille avec l’extension du fichier (PDF, DOCX, …) pour la liste / grille. */
export function FileExtensionBadge({ file, size = 'md', style }: FileExtensionBadgeProps) {
  const { colors } = useTheme();
  const dims = SIZES[size];
  const label = useMemo(() => fileExtensionLabel(file.name), [file.name]);
  const mime = effectiveMimeTypeForFile(file);
  const accent = getFileColor(mime);

  return (
    <View
      style={[
        styles.box,
        {
          width: dims.box,
          height: dims.box,
          borderRadius: BorderRadius.md,
          backgroundColor: `${accent}18`,
          borderColor: `${accent}40`,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { fontSize: dims.font, color: accent }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
