import React, { useMemo, useState } from 'react';
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
import { FileItem } from '@/types';

type ThemeColors = (typeof Colors)['light'];

const mockOfflineItems: FileItem[] = [
  {
    id: 'offline-1',
    name: 'Rapport annuel 2024.pdf',
    type: 'file',
    mimeType: 'application/pdf',
    size: 1024 * 1024 * 5,
    createdAt: new Date('2024-01-15'),
    modifiedAt: new Date('2024-01-20'),
    parentId: null,
    path: '/offline-1',
    isStarred: true,
    isShared: false,
  },
  {
    id: 'offline-2',
    name: 'Présentation client.pptx',
    type: 'file',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 1024 * 1024 * 12,
    createdAt: new Date('2024-01-18'),
    modifiedAt: new Date('2024-01-22'),
    parentId: null,
    path: '/offline-2',
    isStarred: false,
    isShared: true,
  },
  {
    id: 'offline-3',
    name: 'Documents importants',
    type: 'folder',
    createdAt: new Date('2024-01-10'),
    modifiedAt: new Date('2024-01-25'),
    parentId: null,
    path: '/offline-3',
    isStarred: false,
    isShared: false,
  },
];

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

function createOfflineStyles(c: ThemeColors) {
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
    placeholder: {
      width: 40,
    },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    summaryIcon: {
      width: 56,
      height: 56,
      borderRadius: BorderRadius.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryInfo: {
      flex: 1,
    },
    summaryTitle: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.semibold as '600',
      color: c.text,
    },
    summarySubtitle: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
      marginTop: 2,
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
      position: 'relative',
      width: 44,
      height: 44,
      borderRadius: BorderRadius.md,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    offlineBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: c.surface,
      borderRadius: 7,
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

export default function OfflineScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createOfflineStyles(colors), [colors]);
  const [offlineItems, setOfflineItems] = useState<FileItem[]>(mockOfflineItems);

  const handleRemoveOffline = (item: FileItem) => {
    Alert.alert(
      'Supprimer hors-ligne',
      `Voulez-vous supprimer "${item.name}" des fichiers hors-ligne ? Le fichier restera disponible en ligne.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          onPress: () => {
            setOfflineItems(offlineItems.filter((i) => i.id !== item.id));
          },
        },
      ]
    );
  };

  const totalSize = offlineItems.reduce((acc, item) => acc + (item.size || 0), 0);

  const renderItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity style={styles.fileItem}>
      <View style={styles.fileIcon}>
        <Ionicons
          name={getFileIcon(item)}
          size={24}
          color={item.type === 'folder' ? colors.warning : colors.primary}
        />
        <View style={styles.offlineBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        </View>
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileDetails}>
          {item.type === 'folder' ? 'Dossier' : formatFileSize(item.size)}
          {' • Synchronisé le '}
          {item.modifiedAt.toLocaleDateString('fr-FR')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleRemoveOffline(item)}
      >
        <Ionicons name="cloud-offline" size={22} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppBackButton style={styles.backButton} />
        <Text style={styles.headerTitle}>Hors-ligne</Text>
        <View style={styles.placeholder} />
      </View>

      {offlineItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Aucun fichier hors-ligne</Text>
          <Text style={styles.emptySubtitle}>
            Rendez vos fichiers disponibles hors-ligne pour y accéder sans connexion internet
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="cloud-download" size={28} color={colors.primary} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle}>
                {offlineItems.length} {offlineItems.length > 1 ? 'éléments' : 'élément'} hors-ligne
              </Text>
              <Text style={styles.summarySubtitle}>
                Espace utilisé : {formatFileSize(totalSize)}
              </Text>
            </View>
          </View>
          <FlatList
            data={offlineItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </SafeAreaView>
  );
}
