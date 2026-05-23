import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type ThemeColors = (typeof Colors)['light'];

interface FloatingActionButtonProps {
  onCreateFolder: () => void;
  onUploadComplete?: (files: any[]) => void;
}

function createFabStyles(c: ThemeColors) {
  return StyleSheet.create({
    fabContainer: {
      position: 'absolute',
      bottom: 90,
      right: Spacing.lg,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 160,
      gap: Spacing.sm,
    },
    menuItem: {
      alignItems: 'flex-end',
    },
    menuItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    menuItemIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemLabel: {
      backgroundColor: c.surface,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.medium as '500',
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
    },
  });
}

export function FloatingActionButton({ onCreateFolder, onUploadComplete }: FloatingActionButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createFabStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const handlePickImage = async () => {
    toggleMenu();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      onUploadComplete?.(result.assets);
    }
  };

  const handleTakePhoto = async () => {
    toggleMenu();
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) {
      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        onUploadComplete?.(result.assets);
      }
    }
  };

  const handlePickDocument = async () => {
    toggleMenu();
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets) {
      onUploadComplete?.(result.assets);
    }
  };

  const handleCreateFolder = () => {
    toggleMenu();
    onCreateFolder();
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const menuOptions = [
    { icon: 'folder-open' as const, label: 'Nouveau dossier', onPress: handleCreateFolder, color: colors.warning },
    { icon: 'document' as const, label: 'Document', onPress: handlePickDocument, color: colors.primary },
    { icon: 'image' as const, label: 'Photo/Vidéo', onPress: handlePickImage, color: colors.success },
    { icon: 'camera' as const, label: 'Prendre une photo', onPress: handleTakePhoto, color: colors.error },
  ];

  return (
    <>
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={toggleMenu}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleMenu}>
          <View style={styles.menuContainer}>
            {menuOptions.map((option) => {
              const translateY = animation.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              });
              const opacity = animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0, 1],
              });

              return (
                <Animated.View
                  key={option.label}
                  style={[
                    styles.menuItem,
                    {
                      transform: [{ translateY }],
                      opacity,
                    },
                  ]}
                >
                  <TouchableOpacity style={styles.menuItemButton} onPress={option.onPress}>
                    <View style={[styles.menuItemIcon, { backgroundColor: option.color }]}>
                      <Ionicons name={option.icon} size={22} color={colors.white} />
                    </View>
                    <Text style={styles.menuItemLabel}>{option.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={toggleMenu} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={28} color={colors.white} />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </>
  );
}
