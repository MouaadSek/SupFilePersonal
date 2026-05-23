import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { apiStorageBreakdown } from '@/services/api/dashboard';
import { mapApiBreakdownSegments } from '@/services/api/mappers';
import { formatFileSize, formatStoragePair } from '@/utils/format';
import type { StorageBreakdownSegment } from '@/utils/dashboardStorage';

type ThemeColors = (typeof Colors)['light'];

function createProfileStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: {
      fontSize: Typography.sizes.xxl,
      fontWeight: Typography.weights.bold as '700',
      color: c.text,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.md,
      paddingBottom: 100,
    },
    profileCard: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: Spacing.md,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 36,
      fontWeight: Typography.weights.bold as '700',
      color: c.white,
    },
    editAvatarButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: c.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: c.surface,
    },
    userName: {
      fontSize: Typography.sizes.xl,
      fontWeight: Typography.weights.semibold as '600',
      color: c.text,
      marginBottom: Spacing.xs,
    },
    userEmail: {
      fontSize: Typography.sizes.md,
      color: c.textSecondary,
      marginBottom: Spacing.md,
    },
    editProfileButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: c.surfaceSecondary,
      borderRadius: BorderRadius.full,
    },
    editProfileText: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.medium as '500',
      color: c.primary,
    },
    storageCard: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    storageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    storageInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    storageTitle: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.semibold as '600',
      color: c.text,
    },
    storageUsage: {
      fontSize: Typography.sizes.sm,
      fontWeight: Typography.weights.medium as '500',
      color: c.textSecondary,
    },
    storageBarBackground: {
      height: 8,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 4,
      marginBottom: Spacing.md,
      overflow: 'hidden',
    },
    storageBarFill: {
      height: '100%',
      backgroundColor: c.primary,
      borderRadius: 4,
    },
    storageDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    storageDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    storageDetailDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    storageDetailText: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      fontSize: Typography.sizes.xs,
      fontWeight: Typography.weights.semibold as '600',
      color: c.textSecondary,
      marginBottom: Spacing.sm,
      marginLeft: Spacing.xs,
      letterSpacing: 0.5,
    },
    sectionContent: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    settingIcon: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.sm,
    },
    settingContent: {
      flex: 1,
      marginRight: Spacing.sm,
    },
    settingTitle: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.medium as '500',
      color: c.text,
    },
    settingSubtitle: {
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
      marginTop: 2,
    },
    version: {
      textAlign: 'center',
      fontSize: Typography.sizes.sm,
      color: c.textSecondary,
      marginTop: Spacing.lg,
    },
  });
}

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
  danger?: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createProfileStyles>;
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
  danger = false,
  colors,
  styles,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
        style={[
          styles.settingIcon,
          {
            backgroundColor: danger
              ? `${colors.error}22`
              : `${colors.primary}22`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={danger ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && { color: colors.error }]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement}
      {showArrow && onPress ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );
}

function SettingSection({
  title,
  children,
  styles,
}: {
  title: string;
  children: React.ReactNode;
  styles: ReturnType<typeof createProfileStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile, refreshSession } = useAuth();
  const { theme, colors, setTheme } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const [breakdown, setBreakdown] = useState<StorageBreakdownSegment[]>([]);

  useFocusEffect(
    useCallback(() => {
      void refreshSession();
      void apiStorageBreakdown()
        .then((rows) => setBreakdown(mapApiBreakdownSegments(rows)))
        .catch(() => setBreakdown([]));
    }, [refreshSession]),
  );
  const openAvatarLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission requise',
        "Autorisez l'accès à la photothèque pour choisir une photo de profil.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await updateProfile({ avatar: result.assets[0].uri });
  };

  const openAvatarCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorisez l'accès à la caméra pour prendre une photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await updateProfile({ avatar: result.assets[0].uri });
  };

  const handleEditAvatar = () => {
    Alert.alert('Photo de profil', 'Choisissez une source', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Bibliothèque', onPress: () => void openAvatarLibrary() },
      { text: 'Appareil photo', onPress: () => void openAvatarCamera() },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Compte supprimé', 'Votre compte a été supprimé avec succès.');
            logout();
          },
        },
      ],
    );
  };

  const storageUsedBytes = user?.storageUsed ?? 0;
  const storageTotalBytes = user?.storageLimit || 1;
  const storagePercentage =
    storageTotalBytes > 0 ? Math.min(100, (storageUsedBytes / storageTotalBytes) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditAvatar}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => router.push('/(tabs)/profile/edit-profile')}
          >
            <Text style={styles.editProfileText}>Modifier nom et e-mail</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.storageCard}>
          <View style={styles.storageHeader}>
            <View style={styles.storageInfo}>
              <Ionicons name="cloud" size={24} color={colors.primary} />
              <Text style={styles.storageTitle}>Stockage</Text>
            </View>
            <Text style={styles.storageUsage}>
              {formatStoragePair(storageUsedBytes, storageTotalBytes)}
            </Text>
          </View>
          <View style={styles.storageBarBackground}>
            <View style={[styles.storageBarFill, { width: `${storagePercentage}%` }]} />
          </View>
          {breakdown.length > 0 ? (
            <View style={styles.storageDetails}>
              {breakdown.map((seg) => (
                <View key={seg.type} style={styles.storageDetailItem}>
                  <View style={[styles.storageDetailDot, { backgroundColor: seg.color }]} />
                  <Text style={styles.storageDetailText}>
                    {seg.type}: {formatFileSize(seg.size)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <SettingSection title="GÉNÉRAL" styles={styles}>
          <SettingItem
            icon="moon"
            title="Mode sombre"
            subtitle={theme === 'dark' ? 'Activé' : 'Désactivé'}
            showArrow={false}
            colors={colors}
            styles={styles}
            rightElement={
              <Switch
                value={theme === 'dark'}
                onValueChange={(on) => setTheme(on ? 'dark' : 'light')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            }
          />
        </SettingSection>
        <SettingSection title="SÉCURITÉ" styles={styles}>
          <SettingItem
            icon="lock-closed"
            title="Changer le mot de passe"
            onPress={() => router.push('/(tabs)/profile/change-password')}
            colors={colors}
            styles={styles}
          />
        </SettingSection>

        <SettingSection title="COMPTE" styles={styles}>
          <SettingItem
            icon="log-out"
            title="Déconnexion"
            onPress={handleSignOut}
            danger
            colors={colors}
            styles={styles}
          />
        </SettingSection>

        <Text style={styles.version}>SUPFILE v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
