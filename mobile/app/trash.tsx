import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppBackButton } from '@/components/navigation';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useFiles } from '@/contexts/FilesContext';
import type { FileItem } from '@/types';

type ThemeColors = (typeof Colors)['light'];

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}

function getFileIcon(file: FileItem): keyof typeof Ionicons.glyphMap {
  if (file.type === 'folder') return 'folder';
  if (file.mimeType?.startsWith('image/')) return 'image';
  if (file.mimeType?.startsWith('video/')) return 'videocam';
  if (file.mimeType?.startsWith('audio/')) return 'musical-notes';
  if (file.mimeType === 'application/pdf') return 'document-text';
  return 'document';
}

function createTrashStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backButton: {
      padding: Spacing.xs,
      marginRight: Spacing.sm,
    },
    headerTitle: {
      flex: 1,
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.semibold as '600',
      color: c.text,
    },
    emptyButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    emptyButtonText: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.medium as '500',
      color: c.error,
    },
    infoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      padding: Spacing.md,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    infoText: {
      flex: 1,
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
    },
    listContent: {
      padding: Spacing.md,
    },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    fileIcon: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.md,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileInfo: {
      flex: 1,
      marginLeft: Spacing.sm,
      marginRight: Spacing.sm,
    },
    fileName: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.medium as '500',
      color: c.text,
    },
    fileDetails: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
      marginTop: 2,
    },
    actionButton: {
      padding: Spacing.sm,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    emptyTitle: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.semibold as '600',
      color: c.text,
      marginTop: Spacing.md,
    },
    emptySubtitle: {
      fontSize: Typography.sizes.md,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: Spacing.xs,
    },
  });
}

export default function TrashScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createTrashStyles(colors), [colors]);
  const {
    getTrashRoots,
    restoreTrashGroup,
    permanentlyDeleteTrashGroup,
    emptyTrash,
  } = useFiles();

  const trashItems = getTrashRoots();

  const handleRestore = (item: FileItem) => {
    Alert.alert('Restaurer', `Voulez-vous restaurer « ${item.name} » et son contenu associé ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Restaurer',
        onPress: () => void restoreTrashGroup(item.id),
      },
    ]);
  };

  const handleDeletePermanently = (item: FileItem) => {
    Alert.alert(
      'Supprimer définitivement',
      `Supprimer définitivement « ${item.name} » et tout ce qui a été supprimé avec lui ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => void permanentlyDeleteTrashGroup(item.id),
        },
      ],
    );
  };

  const handleEmptyTrash = () => {
    Alert.alert(
      'Vider la corbeille',
      'Supprimer définitivement tous les éléments de la corbeille ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => void emptyTrash(),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: FileItem }) => (
    <View style={styles.fileItem}>
      <View style={styles.fileIcon}>
        <Ionicons
          name={getFileIcon(item)}
          size={24}
          color={item.type === 'folder' ? colors.warning : colors.primary}
        />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileDetails}>
          {item.type === 'folder' ? 'Dossier' : formatFileSize(item.size)}
          {item.deletedAt
            ? ` • Supprimé le ${item.deletedAt.toLocaleDateString('fr-FR')}`
            : ''}
        </Text>
      </View>
      <TouchableOpacity style={styles.actionButton} onPress={() => handleRestore(item)}>
        <Ionicons name="refresh" size={22} color={colors.success} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeletePermanently(item)}>
        <Ionicons name="trash" size={22} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppBackButton style={styles.backButton} />
        <Text style={styles.headerTitle}>Corbeille</Text>
        {trashItems.length > 0 && (
          <TouchableOpacity onPress={handleEmptyTrash} style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Vider</Text>
          </TouchableOpacity>
        )}
      </View>

      {trashItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trash-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Corbeille vide</Text>
          <Text style={styles.emptySubtitle}>
            Les éléments supprimés depuis Mes fichiers apparaissent ici. Vous pouvez les restaurer ou
            les effacer définitivement.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBar}>
            <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Les éléments restent dans la corbeille jusqu’à restauration ou suppression définitive.
              Un dossier et son contenu sont regroupés : restaurer ou supprimer s’applique au groupe.
            </Text>
          </View>
          <FlatList
            data={trashItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </SafeAreaView>
  );
}
