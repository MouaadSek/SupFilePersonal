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
import { X, FolderPlus } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui';
import { FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function CreateFolderModal({ visible, onClose, onSubmit }: CreateFolderModalProps) {
  const { colors } = useTheme();
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!folderName.trim()) {
      setError('Le nom du dossier est requis');
      return;
    }
    if (folderName.includes('/') || folderName.includes('\\')) {
      setError('Le nom ne peut pas contenir de slashs');
      return;
    }
    onSubmit(folderName.trim());
    setFolderName('');
    setError('');
  };

  const handleClose = () => {
    setFolderName('');
    setError('');
    onClose();
  };

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
              <FolderPlus size={24} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Nouveau dossier
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.label, { color: colors.text }]}>
              Nom du dossier
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.error : colors.border,
                },
              ]}
              placeholder="Mon nouveau dossier"
              placeholderTextColor={colors.textTertiary}
              value={folderName}
              onChangeText={(text) => {
                setFolderName(text);
                setError('');
              }}
              autoFocus
            />
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
              title="Creer"
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
  error: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
  },
});
