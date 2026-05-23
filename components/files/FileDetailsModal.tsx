import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { X, FileText, Folder, Calendar, HardDrive, FileType, Link2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui';
import { FileItem } from '@/types';
import { formatFileSize } from '@/data/mockData';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface FileDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  file: FileItem | null;
}

export function FileDetailsModal({ visible, onClose, file }: FileDetailsModalProps) {
  const { colors } = useTheme();

  if (!file) return null;

  const details = [
    { icon: FileType, label: 'Type', value: file.type === 'folder' ? 'Dossier' : (file.mimeType || 'Fichier') },
    ...(file.type === 'file' ? [{ icon: HardDrive, label: 'Taille', value: formatFileSize(file.size || 0) }] : []),
    { icon: Calendar, label: 'Cree le', value: file.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
    { icon: Calendar, label: 'Modifie le', value: file.modifiedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) },
    { icon: Link2, label: 'Chemin', value: file.path },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              {file.type === 'folder' ? (
                <Folder size={32} color={colors.primary} />
              ) : (
                <FileText size={32} color={colors.primary} />
              )}
            </View>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {file.name}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <ScrollView style={styles.content}>
            {details.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <View style={styles.detailLabel}>
                  <detail.icon size={18} color={colors.textSecondary} />
                  <Text style={[styles.labelText, { color: colors.textSecondary }]}>
                    {detail.label}
                  </Text>
                </View>
                <Text style={[styles.valueText, { color: colors.text }]} numberOfLines={2}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </ScrollView>
          
          <Button
            title="Fermer"
            variant="outline"
            onPress={onClose}
            fullWidth
            style={{ marginTop: Spacing.lg }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.lg,
  },
  content: {
    maxHeight: 300,
  },
  detailRow: {
    marginBottom: Spacing.lg,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  labelText: {
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  valueText: {
    fontSize: FontSize.md,
    marginLeft: Spacing.xxl + Spacing.sm,
  },
});
