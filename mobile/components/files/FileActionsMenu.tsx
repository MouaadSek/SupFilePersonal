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
  LogOut,
  Star,
  Eye,
  CheckSquare,
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
  /** Pour les dossiers partagés *avec* l'utilisateur — quitter sans supprimer. */
  onLeaveShare?: () => void;
  /** Ouvrir l'aperçu du fichier. */
  onPreview?: () => void;
  /** Basculer l'état favori. */
  onFavorite?: () => void;
  /** true quand l'élément est déjà dans les favoris. */
  isFavorited?: boolean;
  /** Démarrer la sélection multiple. */
  onSelect?: () => void;
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
  onLeaveShare,
  onPreview,
  onFavorite,
  isFavorited,
  onSelect,
}: FileActionsMenuProps) {
  const { colors } = useTheme();

  if (!file) return null;

  // Permission gating: items the user doesn't own are limited to read actions
  // (open / download / details) unless they have explicit 'write' permission,
  // in which case rename is also allowed. Delete/move stay owner-only because
  // the server's update/trash endpoints still check owner_id.
  const isShared = !!file.shared;
  const canWrite = !isShared || file.permission === 'write';
  const canDelete = !isShared; // owner-only
  const canMove = !isShared; // owner-only
  const canShareCollab = !isShared; // only the owner manages members

  const actions: {
    icon: typeof Edit3;
    label: string;
    onPress: () => void;
    color: string;
  }[] = [];

  if (onSelect) {
    actions.push({ icon: CheckSquare, label: 'Sélectionner', onPress: onSelect, color: colors.text });
  }

  if (onPreview && file.type === 'file') {
    actions.push({ icon: Eye, label: 'Aperçu', onPress: onPreview, color: colors.text });
  }

  if (onFavorite) {
    actions.push({
      icon: Star,
      label: isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris',
      onPress: onFavorite,
      color: isFavorited ? colors.warning : colors.text,
    });
  }

  if (canWrite) {
    actions.push({ icon: Edit3, label: 'Renommer', onPress: onRename, color: colors.text });
  }
  actions.push({ icon: Share2, label: 'Partager', onPress: onShare, color: colors.text });
  if (canShareCollab && onShareCollaboration) {
    actions.push({
      icon: Users,
      label: 'Partage & collaboration',
      onPress: onShareCollaboration,
      color: colors.primary,
    });
  }
  if (file.type === 'file' && (file.localUri || file.downloadUrl)) {
    actions.push({
      icon: ExternalLink,
      label: 'Ouvrir avec une application',
      onPress: onOpenWithExternalApp,
      color: colors.text,
    });
  }
  actions.push({
    icon: Download,
    label: file.type === 'folder' ? 'Télécharger le dossier (ZIP)' : 'Télécharger',
    onPress: onDownload,
    color: colors.text,
  });
  if (canMove) {
    actions.push({ icon: Move, label: 'Deplacer', onPress: onMove, color: colors.text });
  }
  actions.push({ icon: Info, label: 'Details', onPress: onDetails, color: colors.text });

  // Shared folders get "Quitter le dossier" instead of "Supprimer" — recipient
  // can always remove themselves, but the folder/files belong to the owner.
  if (isShared && file.type === 'folder' && onLeaveShare) {
    actions.push({
      icon: LogOut,
      label: 'Quitter le dossier',
      onPress: onLeaveShare,
      color: colors.error,
    });
  } else if (canDelete) {
    actions.push({ icon: Trash2, label: 'Supprimer', onPress: onDelete, color: colors.error });
  }

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

          {/* ScrollView so all actions stay reachable on small phones where the
              menu would otherwise overflow the top of the screen. */}
          <ScrollView
            style={styles.actionsScroll}
            contentContainerStyle={styles.actionsScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
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
          </ScrollView>
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
    // Cap the sheet so its top never goes above the screen even with many
    // actions — the inner ScrollView handles overflow.
    maxHeight: '85%',
  },
  actionsScroll: {
    flexGrow: 0,
  },
  actionsScrollContent: {
    paddingBottom: Spacing.md,
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
