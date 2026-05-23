import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image, Camera, Upload } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { BottomSheet } from './BottomSheet';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

type ImportMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPhotos: () => void;
  onCamera: () => void;
  onDocuments: () => void;
};

export function ImportMenuSheet({
  visible,
  onClose,
  onPhotos,
  onCamera,
  onDocuments,
}: ImportMenuSheetProps) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Importer">
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={onPhotos}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Image size={22} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Photos et vidéos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={onCamera}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Camera size={22} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Prendre une photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row} onPress={onDocuments} activeOpacity={0.7}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryLight }]}>
          <Upload size={22} color={colors.primary} />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>Fichier (tous types)</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.cancel, { backgroundColor: colors.background }]}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Annuler</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  cancel: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
