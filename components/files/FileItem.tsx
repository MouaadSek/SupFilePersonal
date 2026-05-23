import React from 'react';
<<<<<<< Updated upstream
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  MoreVertical,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FileItem as FileItemType } from '@/types';
import { formatFileSize, formatDate, getFileColor } from '@/data/mockData';
=======
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Folder, MoreVertical, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FileItem as FileItemType } from '@/types';
import { formatFileSize, formatDate } from '@/utils/format';
import { isImageFile } from '@/utils/mimeFromFilename';
import { FileThumbnail } from './FileThumbnail';
import { FileExtensionBadge } from './FileExtensionBadge';
>>>>>>> Stashed changes
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface FileItemProps {
  item: FileItemType;
  onPress: () => void;
  onLongPress: () => void;
  onMenuPress: () => void;
  isSelected: boolean;
  viewMode: 'list' | 'grid';
}

export function FileItemComponent({
  item,
  onPress,
  onLongPress,
  onMenuPress,
  isSelected,
  viewMode,
}: FileItemProps) {
  const { colors } = useTheme();

  const listFallback = () => {
    if (item.type === 'folder') {
      return <Folder size={24} color={colors.primary} />;
    }
    return <FileExtensionBadge file={item} size="sm" />;
  };

  const gridFallback = () => {
    if (item.type === 'folder') {
      return (
        <View style={[styles.gridIconContainer, { backgroundColor: colors.primaryLight }]}>
          <Folder size={40} color={colors.primary} />
        </View>
      );
    }
    return <FileExtensionBadge file={item} size="md" />;
  };

  const showImageThumb = item.type === 'file' && isImageFile(item);

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
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <Check size={12} color="#ffffff" />
          </View>
        )}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        
<<<<<<< Updated upstream
        {(item.localUri || item.thumbnail) && item.type === 'file' && item.mimeType?.startsWith('image/') ? (
          <Image
            source={{ uri: item.localUri || item.thumbnail }}
            style={styles.gridThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.gridIconContainer, { backgroundColor: colors.primaryLight }]}>
            {getIcon()}
          </View>
=======
        {showImageThumb ? (
          <FileThumbnail
            item={item}
            style={styles.gridThumbnail}
            containerStyle={styles.gridThumbnailWrap}
            fallback={gridFallback()}
          />
        ) : (
          gridFallback()
>>>>>>> Stashed changes
        )}
        
        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.gridMeta, { color: colors.textSecondary }]}>
          {item.type === 'folder' ? 'Dossier' : formatFileSize(item.size || 0)}
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
      {isSelected && (
        <View style={[styles.listSelectedIndicator, { backgroundColor: colors.primary }]}>
          <Check size={14} color="#ffffff" />
        </View>
      )}
      
      <View style={[styles.listIconContainer, { backgroundColor: isSelected ? colors.primary + '20' : colors.primaryLight }]}>
<<<<<<< Updated upstream
        {(item.localUri || item.thumbnail) && item.type === 'file' && item.mimeType?.startsWith('image/') ? (
          <Image
            source={{ uri: item.localUri || item.thumbnail }}
            style={styles.listThumbnail}
            resizeMode="cover"
          />
        ) : (
          getIcon()
=======
        {showImageThumb ? (
          <FileThumbnail item={item} style={styles.listThumbnail} fallback={listFallback()} />
        ) : (
          listFallback()
>>>>>>> Stashed changes
        )}
      </View>
      
      <View style={styles.listContent}>
        <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.listMeta, { color: colors.textSecondary }]}>
          {item.type === 'folder' 
            ? `Dossier - ${formatDate(item.modifiedAt)}`
            : `${formatFileSize(item.size || 0)} - ${formatDate(item.modifiedAt)}`
          }
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
  // Grid styles
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
  gridIconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  gridThumbnail: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
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
  
  // List styles
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
  listIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  listThumbnail: {
    width: 44,
    height: 44,
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
