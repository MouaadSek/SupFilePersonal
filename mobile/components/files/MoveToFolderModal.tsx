import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { X, Folder } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import type { FileItem } from '@/types';
import { isActive } from '@/utils/fileTree';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

type Row = { id: string | null; name: string; depth: number };

function folderDestinationRows(
  allFiles: FileItem[],
  excludeFolderIds: Set<string>,
): Row[] {
  const folders = allFiles.filter(
    (f) => isActive(f) && f.type === 'folder' && !excludeFolderIds.has(f.id),
  );
  const out: Row[] = [{ id: null, name: 'Racine', depth: 0 }];
  const walk = (parentId: string | null, depth: number) => {
    folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .forEach((f) => {
        out.push({ id: f.id, name: f.name, depth });
        walk(f.id, depth + 1);
      });
  };
  walk(null, 1);
  return out;
}

interface MoveToFolderModalProps {
  visible: boolean;
  onClose: () => void;
  files: FileItem[];
  excludeFolderIds: Set<string>;
  onSelectDestination: (folderId: string | null) => Promise<void>;
}

export function MoveToFolderModal({
  visible,
  onClose,
  files,
  excludeFolderIds,
  onSelectDestination,
}: MoveToFolderModalProps) {
  const { colors } = useTheme();
  const rows = useMemo(
    () => folderDestinationRows(files, excludeFolderIds),
    [files, excludeFolderIds],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Déplacer vers…</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Choisissez le dossier de destination. Les éléments restent dans le même espace ; faites
            glisser mentalement vers le dossier voulu (équivalent au glisser-déposer).
          </Text>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id ?? 'root'}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.row,
                  { paddingLeft: Spacing.md + item.depth * Spacing.lg },
                  { borderBottomColor: colors.border },
                ]}
                onPress={async () => {
                  await onSelectDestination(item.id);
                  onClose();
                }}
              >
                <Folder size={20} color={colors.primary} />
                <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '72%',
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  hint: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.xl,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontSize: FontSize.md,
  },
});
