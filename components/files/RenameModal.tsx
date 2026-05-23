import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { X, Edit3 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui';
import { FileItem } from '@/types';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

/** Dernière portion après le dernier `.` (ex. `.exe`), ou `null` si pas d’extension (`.env`, pas de point, etc.). */
function getExtension(filename: string): string | null {
  const i = filename.lastIndexOf('.');
  if (i <= 0) return null;
  return filename.slice(i);
}

interface RenameModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (newName: string) => void;
  file: FileItem | null;
}

export function RenameModal({ visible, onClose, onSubmit, file }: RenameModalProps) {
  const { colors } = useTheme();
  const [newName, setNewName] = useState(file?.name || '');
  /** Partie avant l’extension (fichiers avec extension uniquement) */
  const [baseName, setBaseName] = useState('');
  const [error, setError] = useState('');

  const lockedExt =
    file?.type === 'file' && file.name ? getExtension(file.name) : null;

  React.useEffect(() => {
    if (file) {
      const ext = file.type === 'file' ? getExtension(file.name) : null;
      if (ext) {
        setBaseName(file.name.slice(0, -ext.length));
        setNewName(file.name);
      } else {
        setBaseName('');
        setNewName(file.name);
      }
    }
  }, [file]);

  const handleSubmit = () => {
    const fullName =
      file?.type === 'file' && lockedExt ? `${baseName.trim()}${lockedExt}` : newName.trim();

    if (!fullName.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (file?.type === 'file' && lockedExt && !baseName.trim()) {
      setError('Indiquez un nom avant l’extension');
      return;
    }
    if (fullName.includes('/') || fullName.includes('\\')) {
      setError('Le nom ne peut pas contenir de slashs');
      return;
    }
    onSubmit(fullName);
    setError('');
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!file) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <Edit3 size={24} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {file.type === 'folder' ? 'Renommer le dossier' : 'Renommer le fichier'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.label, { color: colors.text }]}>
              {lockedExt ? 'Nom du fichier' : 'Nouveau nom'}
            </Text>
            {lockedExt ? (
              <>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: error ? colors.error : colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.inputFlex, { color: colors.text }]}
                    placeholder="Nom sans extension"
                    placeholderTextColor={colors.textTertiary}
                    value={baseName}
                    onChangeText={(text) => {
                      setBaseName(text);
                      setError('');
                    }}
                    autoFocus
                    selectTextOnFocus
                  />
                  <Text
                    style={[styles.extensionSuffix, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {lockedExt}
                  </Text>
                </View>
              </>
            ) : (
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: error ? colors.error : colors.border,
                  },
                ]}
                placeholder="Nouveau nom"
                placeholderTextColor={colors.textTertiary}
                value={newName}
                onChangeText={(text) => {
                  setNewName(text);
                  setError('');
                }}
                autoFocus
                selectTextOnFocus
              />
            )}
            {error ? (
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            ) : null}
          </View>
          
          <View style={styles.actions}>
            <Button
              title="Annuler"
              variant="outline"
              onPress={handleClose}
              style={{ flex: 1, marginRight: Spacing.sm }}
            />
            <Button
              title="Renommer"
              onPress={handleSubmit}
              style={{ flex: 1, marginLeft: Spacing.sm }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  content: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    minHeight: 48,
  },
  inputFlex: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  extensionSuffix: {
    flexShrink: 0,
    fontSize: FontSize.md,
    fontWeight: '600',
    maxWidth: '45%',
  },
  hint: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  error: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
  },
});
