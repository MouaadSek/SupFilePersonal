import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { FileItem } from '@/types';
import { Button } from '../ui/Button';

type ThemeColors = (typeof Colors)['light'];

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  file: FileItem | null;
}

interface ShareUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  permission: 'view' | 'edit' | 'admin';
}

const mockSharedUsers: ShareUser[] = [
  { id: '1', email: 'marie.dupont@email.com', name: 'Marie Dupont', permission: 'edit' },
  { id: '2', email: 'jean.martin@email.com', name: 'Jean Martin', permission: 'view' },
];

function createShareModalStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    closeButton: {
      padding: Spacing.xs,
    },
    title: {
      fontSize: Typography.sizes.lg,
      fontWeight: Typography.weights.semibold as '600',
      color: c.text,
    },
    placeholder: {
      width: 32,
    },
    fileInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      backgroundColor: c.surface,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    fileName: {
      flex: 1,
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.medium as '500',
      color: c.text,
    },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: Spacing.md,
      marginTop: Spacing.md,
      backgroundColor: c.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.xs,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      gap: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    activeTab: {
      backgroundColor: c.white,
    },
    tabText: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
    },
    activeTabText: {
      color: c.primary,
      fontWeight: Typography.weights.medium as '500',
    },
    content: {
      flex: 1,
      padding: Spacing.md,
    },
    inputContainer: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: Typography.sizes.md,
      color: c.text,
    },
    addButton: {
      backgroundColor: c.primary,
      borderRadius: BorderRadius.md,
      width: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.semibold as '600',
      color: c.textSecondary,
      marginBottom: Spacing.sm,
      textTransform: 'uppercase',
    },
    userList: {
      flex: 1,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    userAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userAvatarText: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.semibold as '600',
      color: c.white,
    },
    userInfo: {
      flex: 1,
      marginLeft: Spacing.sm,
    },
    userName: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.medium as '500',
      color: c.text,
    },
    userEmail: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
    },
    permissionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      backgroundColor: c.surface,
      borderRadius: BorderRadius.sm,
      gap: Spacing.xs,
    },
    permissionText: {
      fontSize: Typography.sizes.sm,
      color: c.text,
    },
    removeButton: {
      marginLeft: Spacing.sm,
      padding: Spacing.xs,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xxl,
    },
    emptyText: {
      fontSize: Typography.sizes.md,
      color: c.textSecondary,
      marginTop: Spacing.sm,
      textAlign: 'center',
    },
    linkSection: {
      gap: Spacing.lg,
    },
    linkToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    linkToggleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    linkToggleText: {
      gap: 2,
    },
    linkToggleTitle: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.medium as '500',
      color: c.text,
    },
    linkToggleDescription: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
    },
    linkPermissions: {
      gap: Spacing.sm,
    },
    permissionLabel: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.medium as '500',
      color: c.textSecondary,
    },
    permissionOptions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    permissionOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: c.surface,
      borderRadius: BorderRadius.md,
      gap: Spacing.xs,
    },
    permissionOptionActive: {
      backgroundColor: c.primary,
    },
    permissionOptionText: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
    },
    permissionOptionTextActive: {
      color: c.white,
    },
    linkBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.sm,
    },
    linkText: {
      flex: 1,
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
    },
    copyButton: {
      padding: Spacing.xs,
    },
  });
}

export function ShareModal({ visible, onClose, file }: ShareModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createShareModalStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState<ShareUser[]>(mockSharedUsers);
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [linkPermission, setLinkPermission] = useState<'view' | 'edit'>('view');
  const [activeTab, setActiveTab] = useState<'users' | 'link'>('users');

  const handleAddUser = () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Erreur', 'Adresse email invalide');
      return;
    }

    const newUser: ShareUser = {
      id: Date.now().toString(),
      email: email.trim(),
      name: email.split('@')[0],
      permission: 'view',
    };

    setSharedUsers([...sharedUsers, newUser]);
    setEmail('');
    Alert.alert('Succès', `Invitation envoyée à ${email}`);
  };

  const handleRemoveUser = (userId: string) => {
    Alert.alert(
      'Retirer l\'accès',
      'Êtes-vous sûr de vouloir retirer l\'accès à cet utilisateur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => {
            setSharedUsers(sharedUsers.filter((u) => u.id !== userId));
          },
        },
      ]
    );
  };

  const handleChangePermission = (userId: string, permission: 'view' | 'edit' | 'admin') => {
    setSharedUsers(sharedUsers.map((u) => (u.id === userId ? { ...u, permission } : u)));
  };

  const handleCopyLink = () => {
    Alert.alert('Lien copié', 'Le lien de partage a été copié dans le presse-papiers');
  };

  const renderUserItem = ({ item }: { item: ShareUser }) => (
    <View style={styles.userItem}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={() => {
          const permissions: ('view' | 'edit' | 'admin')[] = ['view', 'edit', 'admin'];
          const currentIndex = permissions.indexOf(item.permission);
          const nextPermission = permissions[(currentIndex + 1) % permissions.length];
          handleChangePermission(item.id, nextPermission);
        }}
      >
        <Text style={styles.permissionText}>
          {item.permission === 'view' && 'Lecture'}
          {item.permission === 'edit' && 'Modification'}
          {item.permission === 'admin' && 'Admin'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveUser(item.id)}>
        <Ionicons name="close-circle" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Partager</Text>
          <View style={styles.placeholder} />
        </View>

        {file && (
          <View style={styles.fileInfo}>
            <Ionicons
              name={file.type === 'folder' ? 'folder' : 'document'}
              size={32}
              color={colors.primary}
            />
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
          </View>
        )}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Ionicons
              name="people"
              size={20}
              color={activeTab === 'users' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Utilisateurs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'link' && styles.activeTab]}
            onPress={() => setActiveTab('link')}
          >
            <Ionicons
              name="link"
              size={20}
              color={activeTab === 'link' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'link' && styles.activeTabText]}>
              Lien
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'users' ? (
          <View style={styles.content}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Ajouter une adresse email..."
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
                <Ionicons name="add" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Personnes ayant accès</Text>

            <FlatList
              data={sharedUsers}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              style={styles.userList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>Aucun utilisateur n'a accès à ce fichier</Text>
                </View>
              }
            />
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.linkSection}>
              <View style={styles.linkToggle}>
                <View style={styles.linkToggleInfo}>
                  <Ionicons name="link" size={24} color={colors.primary} />
                  <View style={styles.linkToggleText}>
                    <Text style={styles.linkToggleTitle}>Partage par lien</Text>
                    <Text style={styles.linkToggleDescription}>
                      Toute personne ayant le lien peut accéder
                    </Text>
                  </View>
                </View>
                <Switch
                  value={linkEnabled}
                  onValueChange={setLinkEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>

              {linkEnabled && (
                <>
                  <View style={styles.linkPermissions}>
                    <Text style={styles.permissionLabel}>Permission du lien :</Text>
                    <View style={styles.permissionOptions}>
                      <TouchableOpacity
                        style={[
                          styles.permissionOption,
                          linkPermission === 'view' && styles.permissionOptionActive,
                        ]}
                        onPress={() => setLinkPermission('view')}
                      >
                        <Ionicons
                          name="eye"
                          size={18}
                          color={linkPermission === 'view' ? colors.white : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.permissionOptionText,
                            linkPermission === 'view' && styles.permissionOptionTextActive,
                          ]}
                        >
                          Lecture
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.permissionOption,
                          linkPermission === 'edit' && styles.permissionOptionActive,
                        ]}
                        onPress={() => setLinkPermission('edit')}
                      >
                        <Ionicons
                          name="create"
                          size={18}
                          color={linkPermission === 'edit' ? colors.white : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.permissionOptionText,
                            linkPermission === 'edit' && styles.permissionOptionTextActive,
                          ]}
                        >
                          Modification
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.linkBox}>
                    <Text style={styles.linkText} numberOfLines={1}>
                      https://supfile.app/share/abc123xyz
                    </Text>
                    <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                      <Ionicons name="copy" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <Button
                    title="Copier le lien"
                    onPress={handleCopyLink}
                    icon={<Ionicons name="copy-outline" size={20} color={colors.white} />}
                  />
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
