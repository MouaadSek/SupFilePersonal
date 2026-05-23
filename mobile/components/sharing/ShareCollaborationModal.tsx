import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Link,
  Lock,
  Calendar,
  Copy,
  Users,
  FolderOpen,
  FileText,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFiles } from '@/contexts/FilesContext';
import type { FileItem, ShareLink } from '@/types';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui';

export type ExpiryPreset = null | 7 | 30 | 90;

const EXPIRY_OPTIONS: { label: string; days: ExpiryPreset }[] = [
  { label: 'Jamais', days: null },
  { label: '7 j.', days: 7 },
  { label: '30 j.', days: 30 },
  { label: '90 j.', days: 90 },
];

interface ShareCollaborationModalProps {
  visible: boolean;
  onClose: () => void;
  item: FileItem | null;
}

export function ShareCollaborationModal({ visible, onClose, item }: ShareCollaborationModalProps) {
  const { colors } = useTheme();
  const { shareLinks, createPublicShareLink, inviteUserToFolder } = useFiles();

  const [expiryDays, setExpiryDays] = useState<ExpiryPreset>(null);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState('');
  const [collabEmail, setCollabEmail] = useState('');
  const [lastCreated, setLastCreated] = useState<ShareLink | null>(null);

  useEffect(() => {
    if (!visible || !item) return;
    setExpiryDays(null);
    setPasswordEnabled(false);
    setPassword('');
    setCollabEmail('');
    setLastCreated(null);
  }, [visible, item?.id]);

  const linksForItem = useMemo(() => {
    if (!item) return [];
    return shareLinks.filter((l) => l.targetId === item.id);
  }, [shareLinks, item?.id]);

  const copyUrl = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copié', 'Le lien a été copié dans le presse-papiers.');
    } catch {
      Alert.alert('Lien', url);
    }
  };

  const handleCreateLink = () => {
    if (!item) return;
    if (passwordEnabled && !password.trim()) {
      Alert.alert('Mot de passe', 'Saisissez un mot de passe ou désactivez la protection.');
      return;
    }
    void (async () => {
      try {
        const link = await createPublicShareLink({
          targetId: item.id,
          targetType: item.type === 'folder' ? 'folder' : 'file',
          expiresInDays: expiryDays,
          password: passwordEnabled ? password : null,
        });
        setLastCreated(link);
        await copyUrl(link.url);
      } catch {
        Alert.alert('Erreur', 'Impossible de créer le lien de partage.');
      }
    })();
  };

  const handleInviteFolder = () => {
    if (!item || item.type !== 'folder') return;
    inviteUserToFolder(item.id, collabEmail);
    setCollabEmail('');
  };

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={12}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              Partage & collaboration
            </Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {item.type === 'folder' ? (
                <FolderOpen size={28} color={colors.primary} />
              ) : (
                <FileText size={28} color={colors.primary} />
              )}
              <View style={styles.itemText}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={[styles.itemHint, { color: colors.textSecondary }]}>
                  {item.type === 'folder' ? 'Dossier' : 'Fichier'} · lien public ou invitation utilisateur
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Lien unique (non-inscrits)
            </Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
              Une personne sans compte peut télécharger le contenu via ce lien. Vous pouvez limiter la durée et
              protéger l’accès par mot de passe.
            </Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowIcon}>
                <Calendar size={18} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Expiration du lien</Text>
              </View>
              <View style={styles.chips}>
                {EXPIRY_OPTIONS.map((opt) => {
                  const active = expiryDays === opt.days;
                  return (
                    <TouchableOpacity
                      key={String(opt.days)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active ? colors.primaryLight : colors.surfaceSecondary,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setExpiryDays(opt.days)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowIcon}>
                    <Lock size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>Mot de passe</Text>
                      <Text style={[styles.smallHint, { color: colors.textSecondary }]}>
                        Exiger un mot de passe pour ouvrir le lien
                      </Text>
                    </View>
                  </View>
                </View>
                <Switch
                  value={passwordEnabled}
                  onValueChange={setPasswordEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              {passwordEnabled ? (
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Mot de passe du lien"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              ) : null}

              <Button title="Générer le lien unique" onPress={handleCreateLink} fullWidth style={{ marginTop: Spacing.md }} />

              {lastCreated ? (
                <View style={[styles.createdBox, { backgroundColor: colors.surfaceSecondary }]}>
                  <Link size={16} color={colors.primary} />
                  <Text style={[styles.urlText, { color: colors.text }]} numberOfLines={2} selectable>
                    {lastCreated.url}
                  </Text>
                  <TouchableOpacity onPress={() => void copyUrl(lastCreated.url)} hitSlop={8}>
                    <Copy size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {linksForItem.length > 0 ? (
              <View style={styles.existingBlock}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Liens déjà créés pour cet élément ({linksForItem.length})
                </Text>
                {linksForItem.slice(0, 3).map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.miniLink, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    onPress={() => void copyUrl(l.url)}
                  >
                    <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {l.url}
                    </Text>
                    <Copy size={16} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {item.type === 'folder' ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
                  Partager avec un utilisateur de la plateforme
                </Text>
                <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
                  Après acceptation, le dossier apparaîtra à la racine de l’espace du destinataire (comportement
                  prévu côté serveur ; ici simulation d’invitation).
                </Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.rowIcon}>
                    <Users size={18} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.text }]}>E-mail du destinataire</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="exemple@domaine.com"
                    placeholderTextColor={colors.textSecondary}
                    value={collabEmail}
                    onChangeText={setCollabEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    title="Envoyer l’invitation"
                    onPress={handleInviteFolder}
                    variant="secondary"
                    fullWidth
                    style={{ marginTop: Spacing.md }}
                  />
                </View>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: FontSize.lg, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  itemText: { flex: 1, minWidth: 0 },
  itemName: { fontSize: FontSize.md, fontWeight: '600' },
  itemHint: { fontSize: FontSize.sm, marginTop: 4 },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sectionDesc: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  rowIcon: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600' },
  smallHint: { fontSize: FontSize.xs, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  input: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    fontSize: FontSize.md,
  },
  createdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  urlText: { flex: 1, fontSize: FontSize.sm },
  existingBlock: { marginTop: Spacing.md },
  miniLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
});
