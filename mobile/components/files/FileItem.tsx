import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MoreVertical, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FileItem as FileItemType } from '@/types';
import { formatFileSize, formatDate } from '@/utils/format';
import { folderChildCount, formatFolderChildLabel } from '@/utils/fileTree';
import { FileListPreview } from './FileListPreview';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface FileItemProps {
  item: FileItemType;
  onPress: () => void;
  onLongPress: () => void;
  onMenuPress: () => void;
  isSelected: boolean;
  viewMode: 'list' | 'grid';
  /** Pour synchroniser le compteur dossier avec le cache. */
  allFiles?: FileItemType[];
}

export function FileItemComponent({
  item,
  onPress,
  onLongPress,
  onMenuPress,
  isSelected,
  viewMode,
  allFiles = [],
}: FileItemProps) {
  const { colors } = useTheme();

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[
          styles.gridItem,
          { backgroundColor: colors.surface },
          isSelected && { borderColor: colors.primary, borderWidth: 2 },
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {isSelected ? (
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <Check size={12} color="#ffffff" />
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <FileListPreview item={item} size="md" containerStyle={styles.gridPreview} />
        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.gridMeta, { color: colors.textSecondary }]}>
          {item.type === 'folder'
            ? formatFolderChildLabel(folderChildCount(item, allFiles))
            : formatFileSize(item.size || 0)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.listItem,
        { backgroundColor: colors.surface },
        isSelected && { backgroundColor: colors.primaryLight },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {isSelected ? (
        <View style={[styles.listSelectedIndicator, { backgroundColor: colors.primary }]}>
          <Check size={14} color="#ffffff" />
        </View>
      ) : null}

      <FileListPreview item={item} size="sm" containerStyle={styles.listPreview} />

      <View style={styles.listContent}>
        <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
          {item.type === 'folder'
            ? `${formatFolderChildLabel(folderChildCount(item, allFiles))} · ${formatDate(item.modifiedAt)}`
            : `${formatFileSize(item.size || 0)} · ${formatDate(item.modifiedAt)}`}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onMenuPress}
        style={styles.listMenuButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MoreVertical size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gridItem: {
    width: '47%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  menuButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
  },
  gridPreview: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  gridName: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  gridMeta: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  listSelectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPreview: {
    marginRight: 0,
  },
  listContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  listName: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  listMeta: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  listMenuButton: {
    padding: Spacing.sm,
  },
});
