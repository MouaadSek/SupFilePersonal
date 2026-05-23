import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import {
  X,
  Edit3,
  Trash2,
  Share2,
  Users,
  Download,
  Move,
  Info,
  ExternalLink,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FileItem } from '@/types';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface FileActionsMenuProps {
  visible: boolean;
  onClose: () => void;
  file: FileItem | null;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
  /** Partage 2.2.4 : lien public + invitation dossier */
  onShareCollaboration?: () => void;
  onDownload: () => void;
  onOpenWithExternalApp: () => void;
  onMove: () => void;
  onDetails: () => void;
}

export function FileActionsMenu({
  visible,
  onClose,
  file,
  onRename,
  onDelete,
  onShare,
  onShareCollaboration,
  onDownload,
  onOpenWithExternalApp,
  onMove,
  onDetails,
}: FileActionsMenuProps) {
  const { colors } = useTheme();

  if (!file) return null;

  const actions = [
    { icon: Edit3, label: 'Renommer', onPress: onRename, color: colors.text },
    { icon: Share2, label: 'Partager', onPress: onShare, color: colors.text },
    ...(onShareCollaboration
      ? [
          {
            icon: Users,
            label: 'Partage & collaboration',
            onPress: onShareCollaboration,
            color: colors.primary,
          } as const,
        ]
      : []),
    ...(file.type === 'file' && (file.localUri || file.downloadUrl)
      ? [
          {
            icon: ExternalLink,
            label: 'Ouvrir avec une application',
            onPress: onOpenWithExternalApp,
            color: colors.text,
          },
        ]
      : []),
    ...(file.type === 'file' || file.type === 'folder'
      ? [
          {
            icon: Download,
            label: file.type === 'folder' ? 'Télécharger le dossier (ZIP)' : 'Télécharger',
            onPress: onDownload,
            color: colors.text,
          },
        ]
      : []),
    { icon: Move, label: 'Deplacer', onPress: onMove, color: colors.text },
    { icon: Info, label: 'Details', onPress: onDetails, color: colors.text },
    { icon: Trash2, label: 'Supprimer', onPress: onDelete, color: colors.error },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {file.name}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.action}
              onPress={() => {
                action.onPress();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <action.icon size={20} color={action.color} />
              <Text style={[styles.actionText, { color: action.color }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.md,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.xl,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  actionText: {
    fontSize: FontSize.md,
    marginLeft: Spacing.md,
  },
});
