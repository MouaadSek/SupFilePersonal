import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Grid,
  List,
  Plus,
  Upload,
  FolderPlus,
  SortAsc,
  X,
  Trash2,
  Move,
  Image,
  Camera,
  Edit3,
  Archive,
  Search,
  Filter,
  Video,
  Music,
  FileText,
  File,
  Folder,
  Check,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFiles } from '@/contexts/FilesContext';
import {
  FileItemComponent,
  Breadcrumb,
  FileActionsMenu,
  CreateFolderModal,
  RenameModal,
  FileDetailsModal,
  MoveToFolderModal,
} from '@/components/files';
import { Button, UploadProgress, ImportMenuSheet } from '@/components/ui';
import { FileItem } from '@/types';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import {
  openDocumentInExternalApp,
  shareDocumentFile,
} from '@/utils/openDocumentInExternalApp';
import {
  fromImagePickerAsset,
  fromDocumentPickerAsset,
} from '@/utils/pendingUpload';
import { excludedMoveTargetFolderIds, isActive } from '@/utils/fileTree';
import {
  applySearchFilters,
  type SearchFileTypeFilter,
  type SearchDateFilter,
} from '@/utils/fileSearchFilters';
import {
  shareFolderZipArchive,
  shareSingleFileToDevice,
} from '@/utils/folderArchiveDownload';
import { ShareCollaborationModal } from '@/components/sharing';

type SortOption = 'name' | 'date' | 'size' | 'type';

export default function FilesScreen() {
  const { colors } = useTheme();
  const {
    files,
    currentFolder,
    selectedFiles,
    breadcrumbs,
    navigateToFolder,
    getFilesInFolder,
    toggleSelection,
    clearSelection,
    createFolder,
    renameItem,
    softDeleteItems,
    enqueueUploadWithProgress,
    uploadJobs,
    dismissCompletedUploads,
    cancelUploadJob,
    moveItems,
    refreshCurrentFolder,
    searchFiles,
    fetchSearchResults,
  } = useFiles();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<FileItem | null>(null);
  const [showFab, setShowFab] = useState(false);
  const [importMenuVisible, setImportMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [moveItemIds, setMoveItemIds] = useState<string[]>([]);
  const [shareCollabVisible, setShareCollabVisible] = useState(false);
  const [shareCollabTarget, setShareCollabTarget] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchTypeFilter, setSearchTypeFilter] = useState<SearchFileTypeFilter>('all');
  const [searchDateFilter, setSearchDateFilter] = useState<SearchDateFilter>('all');
  const [serverSearchResults, setServerSearchResults] = useState<FileItem[]>([]);

  const closeImportMenu = useCallback(() => setImportMenuVisible(false), []);

  const openImportMenu = () => {
    setShowFab(false);
    setImportMenuVisible(true);
  };

  const uploadFromLibrary = async () => {
    closeImportMenu();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission requise',
        "Autorisez l'accès à la photothèque pour importer des photos ou vidéos.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;
    for (const asset of result.assets) {
      const payload = fromImagePickerAsset(asset);
      await enqueueUploadWithProgress(payload, currentFolder);
    }
  };

  const uploadFromCamera = async () => {
    closeImportMenu();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission requise',
        "Autorisez l'accès à la caméra pour prendre une photo.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled || !result.assets?.length) return;
    for (const asset of result.assets) {
      const payload = fromImagePickerAsset(asset);
      await enqueueUploadWithProgress(payload, currentFolder);
    }
  };

  const uploadFromDocumentPicker = async () => {
    closeImportMenu();
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    for (const asset of result.assets) {
      const payload = fromDocumentPickerAsset(asset);
      await enqueueUploadWithProgress(payload, currentFolder);
    }
  };

  const openMoveModal = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setMoveItemIds(ids);
    setMoveModalVisible(true);
  }, []);

  const moveExcludeSet = useMemo(
    () => excludedMoveTargetFolderIds(moveItemIds, files),
    [moveItemIds, files],
  );

  const activeFiles = useMemo(() => files.filter((f) => isActive(f)), [files]);

  const isSearchMode = useMemo(() => {
    const q = searchQuery.trim();
    return q.length >= 2 || searchTypeFilter !== 'all' || searchDateFilter !== 'all';
  }, [searchQuery, searchTypeFilter, searchDateFilter]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!isSearchMode || q.length < 2) {
      setServerSearchResults([]);
      return;
    }
    let cancelled = false;
    void fetchSearchResults(q)
      .then((rows) => {
        if (!cancelled) setServerSearchResults(rows);
      })
      .catch(() => {
        if (!cancelled) setServerSearchResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery, isSearchMode, fetchSearchResults]);

  useFocusEffect(
    useCallback(() => {
      if (!isSearchMode) void refreshCurrentFolder();
    }, [isSearchMode, refreshCurrentFolder]),
  );

  const displayFiles = useMemo(() => {
    let raw: FileItem[];
    if (!isSearchMode) {
      raw = getFilesInFolder(currentFolder);
    } else {
      const q = searchQuery.trim();
      if (q.length >= 2) {
        raw = serverSearchResults.length > 0 ? serverSearchResults : searchFiles(q);
      } else {
        raw = activeFiles;
      }
      raw = applySearchFilters(raw, searchTypeFilter, searchDateFilter);
    }

    const filtered = [...raw];
    filtered.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = (a.mimeType || '').localeCompare(b.mimeType || '');
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
    return filtered;
  }, [
    isSearchMode,
    currentFolder,
    files,
    searchQuery,
    searchTypeFilter,
    searchDateFilter,
    getFilesInFolder,
    searchFiles,
    serverSearchResults,
    activeFiles,
    sortBy,
    sortAsc,
  ]);

  const clearSearchFilters = useCallback(() => {
    setSearchQuery('');
    setSearchTypeFilter('all');
    setSearchDateFilter('all');
  }, []);

  const searchTypeOptions = useMemo(
    () =>
      [
        { id: 'all' as const, label: 'Tous', icon: File },
        { id: 'folder' as const, label: 'Dossiers', icon: Folder },
        { id: 'image' as const, label: 'Images', icon: Image },
        { id: 'video' as const, label: 'Vidéos', icon: Video },
        { id: 'audio' as const, label: 'Audio', icon: Music },
        { id: 'document' as const, label: 'Documents', icon: FileText },
      ] as const,
    [],
  );

  const searchDateOptions = useMemo(
    () =>
      [
        { id: 'all' as const, label: 'Toutes les dates' },
        { id: 'today' as const, label: "Aujourd'hui" },
        { id: 'week' as const, label: '7 derniers jours' },
        { id: 'lastWeek' as const, label: 'Semaine dernière' },
        { id: 'month' as const, label: 'Ce mois-ci' },
        { id: 'year' as const, label: 'Cette année' },
      ] as const,
    [],
  );

  const recentSearchSuggestions = ['Rapport', '.pdf', 'Vacances', 'Budget', 'Photos'];

  const isSelectionMode = selectedFiles.length > 0;

  const handleFilePress = (item: FileItem) => {
    if (isSelectionMode) {
      toggleSelection(item.id);
    } else if (item.type === 'folder') {
      navigateToFolder(item.id);
      if (isSearchMode) clearSearchFilters();
    } else {
      router.push({
        pathname: '/preview/[id]',
        params: { id: item.id },
      });
    }
  };

  const handleFileLongPress = (item: FileItem) => {
    toggleSelection(item.id);
  };

  const handleMenuPress = (item: FileItem) => {
    setSelectedFile(item);
    setShowActionsMenu(true);
  };

  const handleCreateFolder = async (name: string) => {
    await createFolder(name, currentFolder);
    setShowCreateFolder(false);
  };

  const handleRename = async (newName: string) => {
    if (renameTarget) {
      await renameItem(renameTarget.id, newName);
      setShowRenameModal(false);
      setRenameTarget(null);
      setSelectedFile(null);
      clearSelection();
    }
  };

  const openRenameForItem = (item: FileItem) => {
    setRenameTarget(item);
    setShowRenameModal(true);
  };

  const handleDelete = () => {
    const itemsToDelete = isSelectionMode ? selectedFiles : (selectedFile ? [selectedFile.id] : []);
    
    Alert.alert(
      'Mettre à la corbeille',
      `${itemsToDelete.length} élément(s) seront déplacés vers la corbeille. Vous pourrez les restaurer depuis le profil ou l’icône corbeille.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Mettre à la corbeille',
          style: 'destructive',
          onPress: async () => {
            await softDeleteItems(itemsToDelete);
            setSelectedFile(null);
            setShowActionsMenu(false);
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshCurrentFolder();
    } finally {
      setRefreshing(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {isSearchMode ? (
        <View style={[styles.searchBanner, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.searchBannerText, { color: colors.text }]} numberOfLines={2}>
            Résultats dans tout votre espace
          </Text>
          <TouchableOpacity onPress={clearSearchFilters} hitSlop={8}>
            <Text style={[styles.searchBannerAction, { color: colors.primary }]}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.breadcrumbContainer}>
          <Breadcrumb items={breadcrumbs} onNavigate={navigateToFolder} />
        </View>
      )}

      <View style={styles.toolbar}>
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[styles.sortButton, { backgroundColor: colors.surface }]}
            onPress={() => setSortAsc(!sortAsc)}
          >
            <SortAsc
              size={18}
              color={colors.textSecondary}
              style={{ transform: [{ rotate: sortAsc ? '0deg' : '180deg' }] }}
            />
            <Text style={[styles.sortText, { color: colors.textSecondary }]}>
              {sortBy === 'name' ? 'Nom' : sortBy === 'date' ? 'Date' : sortBy === 'size' ? 'Taille' : 'Type'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'list' && { backgroundColor: colors.primaryLight },
            ]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === 'grid' && { backgroundColor: colors.primaryLight },
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Grid size={18} color={viewMode === 'grid' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSelectionToolbar = () => (
    <View style={[styles.selectionToolbar, { backgroundColor: colors.primary }]}>
      <View style={styles.selectionLeft}>
        <TouchableOpacity onPress={clearSelection} style={styles.selectionButton}>
          <X size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.selectionText}>
          {selectedFiles.length} selectionne(s)
        </Text>
      </View>
      <View style={styles.selectionActions}>
        {selectedFiles.length === 1 ? (
          <TouchableOpacity
            style={styles.selectionButton}
            onPress={() => {
              const id = selectedFiles[0];
              const item = files.find(f => f.id === id);
              if (item) openRenameForItem(item);
            }}
          >
            <Edit3 size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => openMoveModal(selectedFiles)}
        >
          <Move size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionButton} onPress={handleDelete}>
          <Trash2 size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun résultat</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Modifiez la recherche (nom, extension), ou les filtres type et date.
      </Text>
      <Button title="Réinitialiser" variant="outline" onPress={clearSearchFilters} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
        <FolderPlus size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Ce dossier est vide
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Importez des fichiers ou creez un nouveau dossier pour commencer
      </Text>
      <View style={styles.emptyActions}>
        <Button
          title="Nouveau dossier"
          variant="outline"
          onPress={() => setShowCreateFolder(true)}
          icon={<FolderPlus size={18} color={colors.primary} />}
          style={{ marginRight: Spacing.sm }}
        />
        <Button
          title="Importer"
          onPress={openImportMenu}
          icon={<Upload size={18} color="#ffffff" />}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Mes fichiers</Text>
        <TouchableOpacity
          onPress={() => router.push('/trash')}
          style={styles.trashLink}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir la corbeille"
        >
          <Archive size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {!isSelectionMode ? (
        <View style={styles.searchSection}>
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchInputWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Rechercher (nom, .pdf, xlsx…)"
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.searchFilterBtn,
                {
                  backgroundColor: showSearchFilters ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowSearchFilters(!showSearchFilters)}
              accessibilityLabel={showSearchFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            >
              <Filter size={20} color={showSearchFilters ? '#ffffff' : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showSearchFilters ? (
            <View
              style={[
                styles.searchFiltersCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.filterBlockTitle, { color: colors.text }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {searchTypeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          searchTypeFilter === opt.id ? colors.primary : colors.surfaceSecondary,
                        borderColor: searchTypeFilter === opt.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSearchTypeFilter(opt.id)}
                  >
                    <opt.icon
                      size={16}
                      color={searchTypeFilter === opt.id ? '#ffffff' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.filterChipLabel,
                        { color: searchTypeFilter === opt.id ? '#ffffff' : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.filterBlockTitle, { color: colors.text, marginTop: Spacing.md }]}>
                Date de modification
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {searchDateOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          searchDateFilter === opt.id ? colors.primary : colors.surfaceSecondary,
                        borderColor: searchDateFilter === opt.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSearchDateFilter(opt.id)}
                  >
                    <View style={styles.dateChipInner}>
                      {searchDateFilter === opt.id ? <Check size={16} color="#ffffff" /> : null}
                      <Text
                        style={[
                          styles.filterChipLabel,
                          { color: searchDateFilter === opt.id ? '#ffffff' : colors.text, marginLeft: 0 },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {!isSearchMode && searchQuery.trim() === '' ? (
            <View style={styles.suggestRow}>
              {recentSearchSuggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestChip, { backgroundColor: colors.surfaceSecondary }]}
                  onPress={() => setSearchQuery(s)}
                >
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={[styles.suggestChipText, { color: colors.text }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {isSelectionMode ? renderSelectionToolbar() : renderHeader()}

      <FlatList
        data={displayFiles}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        contentContainerStyle={[
          styles.listContent,
          viewMode === 'grid' && styles.gridContent,
          displayFiles.length === 0 && styles.emptyContent,
        ]}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        ListHeaderComponent={
          isSearchMode && displayFiles.length > 0 ? (
            <Text style={[styles.searchResultsHint, { color: colors.textSecondary }]}>
              {displayFiles.length} résultat{displayFiles.length > 1 ? 's' : ''}
              {!searchQuery.trim() || searchQuery.trim().length < 2
                ? ' · filtres sur tout l’espace'
                : ''}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <FileItemComponent
            item={item}
            allFiles={files}
            onPress={() => handleFilePress(item)}
            onLongPress={() => handleFileLongPress(item)}
            onMenuPress={() => handleMenuPress(item)}
            isSelected={selectedFiles.includes(item.id)}
            viewMode={viewMode}
          />
        )}
        ListEmptyComponent={isSearchMode ? renderSearchEmpty : renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {/* FAB */}
      {!isSelectionMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowFab(!showFab)}
          activeOpacity={0.8}
        >
          <Plus size={28} color="#ffffff" style={{ transform: [{ rotate: showFab ? '45deg' : '0deg' }] }} />
        </TouchableOpacity>
      )}

      {showFab && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
            onPress={() => {
              setShowFab(false);
              setShowCreateFolder(true);
            }}
          >
            <FolderPlus size={20} color={colors.primary} />
            <Text style={[styles.fabMenuText, { color: colors.text }]}>Nouveau dossier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: colors.surface }]}
            onPress={openImportMenu}
          >
            <Upload size={20} color={colors.primary} />
            <Text style={[styles.fabMenuText, { color: colors.text }]}>Importer un fichier</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <FileActionsMenu
        visible={showActionsMenu}
        onClose={() => {
          setShowActionsMenu(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        onRename={() => {
          if (selectedFile) setRenameTarget(selectedFile);
          setShowRenameModal(true);
        }}
        onDelete={handleDelete}
        onShare={() => {
          if (selectedFile?.type === 'file') void shareDocumentFile(selectedFile);
          else
            Alert.alert(
              'Partage',
              'Pour un dossier, utilisez « Télécharger le dossier (ZIP) » puis partagez le fichier ZIP.',
            );
        }}
        onDownload={() => {
          if (!selectedFile) return;
          if (selectedFile.type === 'folder') void shareFolderZipArchive(selectedFile, files);
          else void shareSingleFileToDevice(selectedFile);
        }}
        onOpenWithExternalApp={() => {
          if (selectedFile) void openDocumentInExternalApp(selectedFile);
        }}
        onMove={() => {
          if (selectedFile) openMoveModal([selectedFile.id]);
        }}
        onDetails={() => {
          if (selectedFile) setDetailsTarget(selectedFile);
          setShowDetailsModal(true);
        }}
        onShareCollaboration={() => {
          if (selectedFile) setShareCollabTarget(selectedFile);
          setShowActionsMenu(false);
          setShareCollabVisible(true);
        }}
      />

      <CreateFolderModal
        visible={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSubmit={handleCreateFolder}
      />

      <RenameModal
        visible={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setRenameTarget(null);
        }}
        onSubmit={handleRename}
        file={renameTarget}
      />

      <FileDetailsModal
        visible={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setDetailsTarget(null);
          setSelectedFile(null);
        }}
        file={detailsTarget}
      />

      <ShareCollaborationModal
        visible={shareCollabVisible}
        onClose={() => {
          setShareCollabVisible(false);
          setShareCollabTarget(null);
        }}
        item={shareCollabTarget}
      />

      <ImportMenuSheet
        visible={importMenuVisible}
        onClose={closeImportMenu}
        onPhotos={uploadFromLibrary}
        onCamera={uploadFromCamera}
        onDocuments={uploadFromDocumentPicker}
      />

      <MoveToFolderModal
        visible={moveModalVisible}
        onClose={() => {
          setMoveModalVisible(false);
          setMoveItemIds([]);
        }}
        files={files}
        excludeFolderIds={moveExcludeSet}
        onSelectDestination={async (folderId) => {
          await moveItems(moveItemIds, folderId);
          setMoveModalVisible(false);
          setMoveItemIds([]);
          clearSelection();
        }}
      />

      <UploadProgress
        uploads={uploadJobs}
        onCancel={cancelUploadJob}
        onDismiss={dismissCompletedUploads}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  trashLink: {
    padding: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  headerContainer: {
    paddingHorizontal: Spacing.xl,
  },
  breadcrumbContainer: {
    marginBottom: Spacing.sm,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sortText: {
    fontSize: FontSize.sm,
    marginLeft: Spacing.xs,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  viewButton: {
    padding: Spacing.sm,
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  selectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionButton: {
    padding: Spacing.sm,
  },
  selectionText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  selectionActions: {
    flexDirection: 'row',
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  gridContent: {
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
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
  emptyDescription: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  emptyActions: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabMenu: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: 100,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  fabMenuText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginLeft: Spacing.md,
  },
  searchResultsHint: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  searchFilterBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchFiltersCard: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterBlockTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  filterChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  dateChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  suggestChipText: {
    fontSize: FontSize.xs,
  },
  searchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  searchBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  searchBannerAction: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
