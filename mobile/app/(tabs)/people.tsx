import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, Users, Share2, FolderOpen } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFiles } from '@/contexts/FilesContext';
import { apiSearchUsers, ApiUserSearchResult } from '@/services/api/users';
import { avatarUrl } from '@/services/api/client';
import { MoveToFolderModal } from '@/components/files';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

export default function PeopleScreen() {
  const { colors } = useTheme();
  const { files, inviteUserToFolder } = useFiles();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiUserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [shareFolderUser, setShareFolderUser] = useState<ApiUserSearchResult | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiSearchUsers(q.trim());
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleShareFolder = (user: ApiUserSearchResult) => {
    setShareFolderUser(user);
    setShowFolderPicker(true);
  };

  const handleFolderSelected = (folderId: string | null) => {
    setShowFolderPicker(false);
    if (!folderId || !shareFolderUser) return;
    const folder = files.find((f) => f.id === folderId && f.type === 'folder');
    if (!folder) return;
    Alert.alert(
      'Partager le dossier',
      `Partager « ${folder.name} » avec ${shareFolderUser.display_name} (${shareFolderUser.email}) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Partager',
          onPress: () => {
            inviteUserToFolder(folderId, shareFolderUser.email);
            setShareFolderUser(null);
          },
        },
      ],
    );
  };

  const folders = files.filter((f) => f.type === 'folder' && !f.deletedAt);

  const renderUser = ({ item }: { item: ApiUserSearchResult }) => {
    const uri = avatarUrl(item.avatar_url);
    const initials = (item.display_name || item.email)
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
        <View style={styles.userLeft}>
          {uri ? (
            <Image source={{ uri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {item.display_name}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.shareBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => handleShareFolder(item)}
        >
          <Share2 size={16} color={colors.primary} />
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>Partager</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (!searched) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
            <Users size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Trouver des utilisateurs</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Recherchez par nom ou adresse e-mail pour partager vos dossiers.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun résultat</Text>
        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
          Aucun utilisateur trouvé pour « {query} ».
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Personnes</Text>
      </View>

      <View style={styles.searchSection}>
        <View
          style={[
            styles.searchInputWrap,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Nom ou adresse e-mail…"
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={search}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => search('')} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={colors.primary}
          size="large"
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={[
            styles.listContent,
            results.length === 0 && styles.emptyContent,
          ]}
          ListEmptyComponent={renderEmpty}
        />
      )}

      <MoveToFolderModal
        visible={showFolderPicker}
        onClose={() => {
          setShowFolderPicker(false);
          setShareFolderUser(null);
        }}
        files={folders}
        excludeFolderIds={new Set()}
        onSelectDestination={handleFolderSelected}
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
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  loader: {
    marginTop: Spacing.xxxl,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  emptyContent: {
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    minWidth: 0,
  },
  userName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    flexShrink: 0,
  },
  shareBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
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
