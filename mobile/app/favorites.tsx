import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useFiles } from '@/contexts/FilesContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { FileItemComponent } from '@/components/files';
import { AppBackButton } from '@/components/navigation';
import { FileItem } from '@/types';
import { FontSize, Spacing } from '@/constants/theme';
import { isPreviewableFile } from '@/utils/mimeFromFilename';
import { shareSingleFileToDevice } from '@/utils/folderArchiveDownload';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const { files, navigateToFolder } = useFiles();
  const { favoritedIds } = useFavorites();

  const favoriteItems = useMemo(
    () => files.filter((f) => !f.deletedAt && favoritedIds.has(f.id)),
    [files, favoritedIds],
  );

  const handlePress = (item: FileItem) => {
    if (item.type === 'folder') {
      navigateToFolder(item.id);
      router.push('/(tabs)/files');
    } else if (isPreviewableFile(item)) {
      const previewableIds = favoriteItems
        .filter((f) => f.type === 'file' && isPreviewableFile(f))
        .map((f) => f.id)
        .join(',');
      router.push({
        pathname: '/preview/[id]',
        params: { id: item.id, fileIds: previewableIds },
      });
    } else {
      void shareSingleFileToDevice(item);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
        <Star size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun favori</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        Appuyez sur l'étoile d'un fichier ou dossier pour l'ajouter ici.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <AppBackButton />
        <Text style={[styles.title, { color: colors.text }]}>Favoris</Text>
      </View>

      <FlatList
        data={favoriteItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FileItemComponent
            item={item}
            allFiles={files}
            onPress={() => handlePress(item)}
            onLongPress={() => {}}
            onMenuPress={() => {}}
            isSelected={false}
            viewMode="list"
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          favoriteItems.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl * 2,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
