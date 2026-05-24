import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Cloud,
  FolderOpen,
  Image,
  FileText,
  Upload,
  Clock,
  ChevronRight,
  Plus,
  FolderPlus,
  Camera,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFiles } from '@/contexts/FilesContext';
import { UploadProgress, BottomSheet } from '@/components/ui';
import { CreateFolderModal } from '@/components/files';
import { StorageBreakdownChart } from '@/components/dashboard';
import { formatFileSize, formatDate } from '@/utils/format';
import { apiDashboardHome } from '@/services/api/dashboard';
import { mapApiBreakdownSegments, mapApiFile } from '@/services/api/mappers';
import type { Activity } from '@/types';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { FileItem } from '@/types';
import {
  fromImagePickerAsset,
  fromDocumentPickerAsset,
} from '@/utils/pendingUpload';
import {
  buildDashboardBreakdown,
  getRecentFilesForDashboard,
  lastActivityLabel,
  lastActivityTimestamp,
} from '@/utils/dashboardStorage';
import { FileListPreview } from '@/components/files';
import { folderChildCount, formatFolderChildLabel } from '@/utils/fileTree';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    files,
    navigateToFolder,
    enqueueUploadWithProgress,
    createFolder,
    isLoading,
    uploadJobs,
    dismissCompletedUploads,
    cancelUploadJob,
    refreshRootListing,
  } = useFiles();
  const [newMenuVisible, setNewMenuVisible] = useState(false);
  const [createFolderVisible, setCreateFolderVisible] = useState(false);

  const closeNewMenu = useCallback(() => setNewMenuVisible(false), []);

  const handleCreateFolderSubmit = async (name: string) => {
    await createFolder(name, null);
    setCreateFolderVisible(false);
  };

  const uploadFromLibrary = async () => {
    closeNewMenu();
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission requise',
          "Autorisez l'accès à la photothèque pour importer des photos ou vidéos.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.All,
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;
      for (const asset of result.assets) {
        const payload = fromImagePickerAsset(asset);
        await enqueueUploadWithProgress(payload, null);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'importer le fichier. Veuillez réessayer.");
    }
  };

  const uploadFromCamera = async () => {
    closeNewMenu();
    try {
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
        await enqueueUploadWithProgress(payload, null);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'importer la photo. Veuillez réessayer.");
    }
  };

  const uploadFromDocumentPicker = async () => {
    closeNewMenu();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      for (const asset of result.assets) {
        const payload = fromDocumentPickerAsset(asset);
        await enqueueUploadWithProgress(payload, null);
      }
    } catch {
      Alert.alert('Erreur', "Impossible d'importer le document. Veuillez réessayer.");
    }
  };

  const openCreateFolder = () => {
    closeNewMenu();
    setCreateFolderVisible(true);
  };

  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [apiRecentFiles, setApiRecentFiles] = useState<FileItem[]>([]);
  const [breakdownSegments, setBreakdownSegments] = useState<
    ReturnType<typeof mapApiBreakdownSegments>
  >([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void refreshRootListing();
      void apiDashboardHome()
        .then((home) => {
          setBreakdownSegments(mapApiBreakdownSegments(home.breakdown));
          setApiRecentFiles(
            (home.recent ?? []).map((f) => mapApiFile(f, f.folder_id ? `/${f.name}` : `/${f.name}`)),
          );
          setRecentActivities(
            (home.recent ?? []).map((f, i) => ({
              id: f.id || `recent-${i}`,
              type: 'upload' as const,
              fileName: f.name,
              fileId: f.id,
              timestamp: new Date(f.updated_at || f.created_at || Date.now()),
            })),
          );
        })
        .catch(() => {
          /* keep computed fallback from local files */
        });
    }, [user, refreshRootListing]),
  );

  const storageUsed = user?.storageUsed ?? 0;
  const storageTotal = Math.max(user?.storageLimit ?? 1, 1);
  const storagePercentage = (storageUsed / storageTotal) * 100;

  const recentFiles = useMemo(() => {
    const source =
      apiRecentFiles.length > 0
        ? apiRecentFiles.map((apiF) => {
            const cached = files.find((f) => f.id === apiF.id && !f.deletedAt);
            return cached ?? apiF;
          })
        : getRecentFilesForDashboard(files, 5);
    return source.slice(0, 5);
  }, [files, apiRecentFiles]);

  const folders = files.filter((f) => !f.deletedAt && f.type === 'folder' && f.parentId === null);

  const dashboardBreakdown = useMemo(() => {
    if (breakdownSegments.length > 0) return breakdownSegments;
    return buildDashboardBreakdown(files, storageUsed, [
      { type: 'Photos', size: 0, color: '#10b981' },
      { type: 'Documents', size: 0, color: '#30a8fe' },
      { type: 'Autres', size: 0, color: '#94a3b8' },
    ]);
  }, [files, storageUsed, breakdownSegments]);

  const quickActions = [
    { icon: Upload, label: 'Importer', color: colors.primary },
    { icon: FolderOpen, label: 'Nouveau dossier', color: '#10b981' },
    { icon: Image, label: 'Photos', color: '#f59e0b' },
    { icon: FileText, label: 'Documents', color: '#3b82f6' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
      <CreateFolderModal
        visible={createFolderVisible}
        onClose={() => setCreateFolderVisible(false)}
        onSubmit={handleCreateFolderSubmit}
      />
      <BottomSheet visible={newMenuVisible} onClose={closeNewMenu} title="Nouveau">
        <TouchableOpacity
          style={[styles.newMenuRow, { borderBottomColor: colors.border }]}
          onPress={openCreateFolder}
          activeOpacity={0.7}
        >
          <View style={[styles.newMenuIconWrap, { backgroundColor: colors.primaryLight }]}>
            <FolderPlus size={22} color={colors.primary} />
          </View>
          <Text style={[styles.newMenuLabel, { color: colors.text }]}>Nouveau dossier</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.newMenuRow, { borderBottomColor: colors.border }]}
          onPress={uploadFromLibrary}
          activeOpacity={0.7}
        >
          <View style={[styles.newMenuIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Image size={22} color={colors.primary} />
          </View>
          <Text style={[styles.newMenuLabel, { color: colors.text }]}>Photos et vidéos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.newMenuRow, { borderBottomColor: colors.border }]}
          onPress={uploadFromCamera}
          activeOpacity={0.7}
        >
          <View style={[styles.newMenuIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Camera size={22} color={colors.primary} />
          </View>
          <Text style={[styles.newMenuLabel, { color: colors.text }]}>Prendre une photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.newMenuRow} onPress={uploadFromDocumentPicker} activeOpacity={0.7}>
          <View style={[styles.newMenuIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Upload size={22} color={colors.primary} />
          </View>
          <Text style={[styles.newMenuLabel, { color: colors.text }]}>Fichier (tous types)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.newMenuCancel, { backgroundColor: colors.background }]}
          onPress={closeNewMenu}
          activeOpacity={0.7}
        >
          <Text style={[styles.newMenuCancelText, { color: colors.textSecondary }]}>Annuler</Text>
        </TouchableOpacity>
      </BottomSheet>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Bonjour,
          </Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || 'Utilisateur'}
          </Text>
        </View>

        {/* Tableau de bord — état du compte */}
        <View style={styles.dashboardHeading}>
          <Text style={[styles.dashboardTitle, { color: colors.text }]}>Tableau de bord</Text>
          <Text style={[styles.dashboardSubtitle, { color: colors.textSecondary }]}>
            Espace disque et accès rapide à vos derniers fichiers
          </Text>
        </View>

        <View style={[styles.storageCard, { backgroundColor: colors.primary }]}>
          <View style={styles.storageHeader}>
            <Cloud size={24} color="#ffffff" />
            <Text style={styles.storageTitle}>Espace de stockage</Text>
          </View>
          <View style={styles.storageInfo}>
            <Text style={styles.storageUsed}>
              {formatFileSize(storageUsed)}
            </Text>
            <Text style={styles.storageTotal}>
              {' '}/ {formatFileSize(storageTotal)}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(100, storagePercentage)}%` },
              ]}
            />
          </View>
        </View>

        <StorageBreakdownChart
          segments={dashboardBreakdown}
          totalForPercent={storageUsed}
          title="Répartition de l’espace disque"
        />

        {/* Folders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Mes dossiers
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/files')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foldersScroll}
          >
            {folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={[styles.folderCard, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
                onPress={() => {
                  navigateToFolder(folder.id);
                  router.push('/(tabs)/files');
                }}
              >
                <FolderOpen size={32} color={colors.primary} />
                <Text
                  style={[styles.folderName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {folder.name}
                </Text>
                <Text style={[styles.folderInfo, { color: colors.textSecondary }]}>
                  {formatFolderChildLabel(folderChildCount(folder, files))}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.folderCard,
                styles.newFolderCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => setNewMenuVisible(true)}
            >
              <Plus size={32} color={colors.primary} />
              <Text style={[styles.folderName, { color: colors.primary }]}>
                Nouveau
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Accès rapide — 5 derniers modifiés ou importés */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Accès rapide
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/files')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Mes fichiers</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.quickAccessHint, { color: colors.textSecondary }]}>
            Les 5 fichiers les plus récemment modifiés ou ajoutés
          </Text>
          {recentFiles.map((file) => (
            <TouchableOpacity
              key={file.id}
              style={[styles.recentFile, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/preview/[id]',
                  params: { id: file.id },
                })
              }
            >
              <FileListPreview
                item={file}
                size="sm"
                containerStyle={[styles.fileIcon, { backgroundColor: colors.primaryLight }]}
                imageStyle={styles.fileIconImage}
              />
              <View style={styles.fileInfo}>
                <Text
                  style={[styles.fileName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {file.name}
                </Text>
                <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                  {formatFileSize(file.size || 0)} · {lastActivityLabel(file)}{' '}
                  {formatDate(new Date(lastActivityTimestamp(file)))}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {recentActivities.length > 0 ? (
        <View style={[styles.section, { marginBottom: Spacing.xxxl }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Activite recente
            </Text>
          </View>
          {recentActivities.slice(0, 3).map((activity) => (
            <View
              key={activity.id}
              style={[styles.activityItem, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.activityIcon, { backgroundColor: colors.primaryLight }]}>
                <Clock size={16} color={colors.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityText, { color: colors.text }]}>
                  {activity.type === 'upload' && 'Importe: '}
                  {activity.type === 'download' && 'Telecharge: '}
                  {activity.type === 'share' && 'Partage: '}
                  {activity.type === 'rename' && 'Renomme: '}
                  {activity.type === 'delete' && 'Supprime: '}
                  {activity.type === 'move' && 'Deplace: '}
                  <Text style={{ fontWeight: '600' }}>{activity.fileName ?? 'Fichier'}</Text>
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  {formatDate(activity.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
        ) : null}
      </ScrollView>
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 10,
  },
  newMenuRow: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  newMenuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  newMenuLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  newMenuCancel: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  newMenuCancelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.md,
  },
  userName: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  dashboardHeading: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  dashboardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  dashboardSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 4,
    lineHeight: 20,
  },
  storageCard: {
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  storageTitle: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  storageUsed: {
    color: '#ffffff',
    fontSize: FontSize.display,
    fontWeight: '700',
  },
  storageTotal: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FontSize.md,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  storageHint: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  quickAccessHint: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: (screenWidth - Spacing.xl * 2 - Spacing.md * 3) / 4,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    textAlign: 'center',
  },
  foldersScroll: {
    paddingRight: Spacing.xl,
  },
  folderCard: {
    width: 120,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    alignItems: 'center',
  },
  newFolderCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  folderName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  folderInfo: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  recentFile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fileIconImage: {
    width: 44,
    height: 44,
  },
  fileInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  fileName: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  fileMeta: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  activityText: {
    fontSize: FontSize.sm,
  },
  activityTime: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
