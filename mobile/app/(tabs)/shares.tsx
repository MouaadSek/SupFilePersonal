import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  Link,
  Users,
  Copy,
  Trash2,
  Clock,
  Lock,
  Download,
  ExternalLink,
  Plus,
  Share2,
  FolderOpen,
  FileText,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFiles } from '@/contexts/FilesContext';
import { formatDate } from '@/data/mockData';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { ShareCollaborationModal } from '@/components/sharing';
import { isActive } from '@/utils/fileTree';
import type { FileItem, IncomingShareEntry, ShareLink } from '@/types';

type TabType = 'links' | 'shared';

export default function SharesScreen() {
  const { colors } = useTheme();
  const { files, shareLinks, incomingShares, revokePublicShareLink, navigateToFolder, refreshShares } =
    useFiles();
  const [activeTab, setActiveTab] = useState<TabType>('links');

  useFocusEffect(
    useCallback(() => {
      void refreshShares();
    }, [refreshShares]),
  );
  const [pickVisible, setPickVisible] = useState(false);
  const [shareTarget, setShareTarget] = useState<FileItem | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const pickableItems = useMemo(() => {
    return [...files]
      .filter((f) => isActive(f))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .slice(0, 60);
  }, [files]);

  const resolveLinkTarget = (link: ShareLink) => {
    return files.find((f) => f.id === link.targetId && isActive(f));
  };

  const handleCopyLink = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copié', 'Lien copié dans le presse-papiers.');
    } catch {
      Alert.alert('Lien', url);
    }
  };

  const handleDeleteLink = (id: string) => {
    Alert.alert(
      'Supprimer le lien',
      'Les personnes disposant de ce lien ne pourront plus télécharger le contenu.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => revokePublicShareLink(id),
        },
      ],
    );
  };

  const openShareFlow = (item: FileItem) => {
    setPickVisible(false);
    setShareTarget(item);
    setShareModalVisible(true);
  };

  const renderLinkItem = ({ item }: { item: ShareLink }) => {
    const target = resolveLinkTarget(item);
    const typeLabel = item.targetType === 'folder' ? 'Dossier' : 'Fichier';

    return (
      <View style={[styles.linkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.linkHeader}>
          <View style={[styles.linkIcon, { backgroundColor: colors.primaryLight }]}>
            {item.targetType === 'folder' ? (
              <FolderOpen size={20} color={colors.primary} />
            ) : (
              <Link size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.linkInfo}>
            <Text style={[styles.linkName, { color: colors.text }]} numberOfLines={1}>
              {target?.name || 'Élément supprimé ou déplacé'}
            </Text>
            <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.url}
            </Text>
            <Text style={[styles.typePill, { color: colors.primary }]}>
              {typeLabel} · lien public
            </Text>
          </View>
        </View>

        <View style={styles.linkMeta}>
          <View style={styles.metaItem}>
            <Download size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.downloads} téléchargement{item.downloads > 1 ? 's' : ''}
            </Text>
          </View>
          {item.expiresAt ? (
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                Expire le {item.expiresAt.toLocaleDateString('fr-FR')}
              </Text>
            </View>
          ) : (
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>Sans date d’expiration</Text>
            </View>
          )}
          {item.password ? (
            <View style={styles.metaItem}>
              <Lock size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>Protégé par mot de passe</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.linkActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primaryLight }]}
            onPress={() => void handleCopyLink(item.url)}
          >
            <Copy size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Copier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => {
              void Linking.openURL(item.url).catch(() =>
                Alert.alert('Erreur', 'Impossible d’ouvrir ce lien.'),
              );
            }}
          >
            <ExternalLink size={16} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Ouvrir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: `${colors.error}15` }]}
            onPress={() => handleDeleteLink(item.id)}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const openIncomingShare = (item: IncomingShareEntry) => {
    navigateToFolder(item.id);
    router.push('/(tabs)/files');
  };

  const renderSharedItem = ({ item }: { item: IncomingShareEntry }) => (
    <TouchableOpacity
      style={[styles.sharedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => openIncomingShare(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.sharedIcon, { backgroundColor: colors.primaryLight }]}>
        {item.itemType === 'folder' ? (
          <FolderOpen size={20} color={colors.primary} />
        ) : (
          <FileText size={20} color={colors.primary} />
        )}
      </View>
      <View style={styles.sharedInfo}>
        <Text style={[styles.sharedName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.sharedMeta, { color: colors.textSecondary }]}>
          De {item.ownerLabel} · {item.itemType === 'folder' ? 'Dossier à la racine' : 'Fichier'}
        </Text>
        <Text style={[styles.sharedDate, { color: colors.textSecondary }]}>
          Partagé le {formatDate(item.sharedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyLinks = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
        <Link size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun lien de partage</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Créez un lien unique (fichier ou dossier) avec expiration ou mot de passe via le bouton +, ou depuis
        Fichiers → menu d’un élément → Partage & collaboration.
      </Text>
    </View>
  );

  const renderEmptyShared = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
        <Users size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun partage reçu</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Lorsqu’un collègue partage un dossier avec vous sur la plateforme, il apparaîtra ici à la racine de votre
        espace après acceptation.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Partages</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'links' && { backgroundColor: colors.primaryLight }]}
          onPress={() => setActiveTab('links')}
        >
          <Link size={18} color={activeTab === 'links' ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'links' ? colors.primary : colors.textSecondary },
            ]}
          >
            Mes liens publics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shared' && { backgroundColor: colors.primaryLight }]}
          onPress={() => setActiveTab('shared')}
        >
          <Users size={18} color={activeTab === 'shared' ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'shared' ? colors.primary : colors.textSecondary },
            ]}
          >
            Partagés avec moi
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'links' ? (
        <FlatList
          data={shareLinks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            shareLinks.length === 0 && styles.emptyContent,
          ]}
          renderItem={renderLinkItem}
          ListEmptyComponent={renderEmptyLinks}
        />
      ) : (
        <FlatList
          data={incomingShares}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            incomingShares.length === 0 && styles.emptyContent,
          ]}
          renderItem={renderSharedItem}
          ListEmptyComponent={renderEmptyShared}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
        onPress={() => setPickVisible(true)}
        accessibilityLabel="Créer un lien de partage"
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={pickVisible} transparent animationType="fade" onRequestClose={() => setPickVisible(false)}>
        <Pressable style={styles.pickOverlay} onPress={() => setPickVisible(false)}>
          <Pressable
            style={[styles.pickSheet, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.pickHeader}>
              <Text style={[styles.pickTitle, { color: colors.text }]}>Choisir un élément</Text>
              <TouchableOpacity onPress={() => setPickVisible(false)} hitSlop={12}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.pickHint, { color: colors.textSecondary }]}>
              Fichier ou dossier pour générer un lien (non-inscrits) et options d’expiration / mot de passe.
            </Text>
            <FlatList
              data={pickableItems}
              keyExtractor={(i) => i.id}
              style={styles.pickList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickRow, { borderBottomColor: colors.border }]}
                  onPress={() => openShareFlow(item)}
                  activeOpacity={0.7}
                >
                  {item.type === 'folder' ? (
                    <FolderOpen size={22} color={colors.primary} />
                  ) : (
                    <FileText size={22} color={colors.primary} />
                  )}
                  <View style={styles.pickRowText}>
                    <Text style={[styles.pickName, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.pickPath, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.path}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <ShareCollaborationModal
        visible={shareModalVisible}
        onClose={() => {
          setShareModalVisible(false);
          setShareTarget(null);
        }}
        item={shareTarget}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  specBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
  },
  linkCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  linkName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  linkUrl: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  typePill: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 4,
  },
  linkMeta: {
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  linkActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.xs,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginLeft: Spacing.xs,
  },
  sharedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sharedIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  sharedName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  sharedMeta: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  sharedDate: {
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
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
    lineHeight: 22,
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
  pickOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickSheet: {
    maxHeight: '72%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  pickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  pickTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  pickHint: {
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  pickList: {
    paddingHorizontal: Spacing.md,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  pickRowText: {
    flex: 1,
    minWidth: 0,
  },
  pickName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  pickPath: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
