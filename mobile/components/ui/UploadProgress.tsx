import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

type ThemeColors = (typeof Colors)['light'];

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
}

interface UploadProgressProps {
  uploads: UploadItem[];
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onDismiss?: () => void;
}

function createUploadProgressStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 160,
      left: Spacing.md,
      right: Spacing.md,
      backgroundColor: c.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    headerInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    headerTitle: {
      fontSize: Typography.sizes.md,
      fontWeight: Typography.weights.semibold as '600',
      color: c.text,
    },
    dismissButton: {
      padding: Spacing.xs,
    },
    uploadItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.xs,
    },
    uploadInfo: {
      flex: 1,
      marginRight: Spacing.sm,
    },
    uploadName: {
      fontSize: Typography.sizes.sm,
      color: c.text,
      marginBottom: 4,
    },
    progressBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    progressBarBackground: {
      flex: 1,
      height: 4,
      backgroundColor: c.surfaceSecondary,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: c.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: Typography.sizes.xs,
      color: c.textSecondary,
      width: 35,
      textAlign: 'right',
    },
    statusText: {
      fontSize: Typography.sizes.xs,
      color: c.success,
    },
    actionButton: {
      padding: Spacing.xs,
    },
  });
}

const SETTLED_VISIBLE_MS = 2000;
const FAILED_VISIBLE_MS = 3200;
const FADE_OUT_MS = 900;

export function UploadProgress({ uploads, onCancel, onRetry, onDismiss }: UploadProgressProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createUploadProgressStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(1)).current;
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const completedCount = uploads.filter((u) => u.status === 'completed').length;
  const failedCount = uploads.filter((u) => u.status === 'failed').length;
  const hasFailed = failedCount > 0;
  const allSettled =
    uploads.length > 0 && uploads.every((u) => u.status === 'completed' || u.status === 'failed');
  const allCompleted = allSettled && !hasFailed;

  useEffect(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    opacity.stopAnimation();
    opacity.setValue(1);

    if (!allSettled) return;

    const delay = hasFailed ? FAILED_VISIBLE_MS : SETTLED_VISIBLE_MS;
    fadeTimerRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismissRef.current?.();
      });
    }, delay);

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [allSettled, hasFailed, uploads.length, opacity]);

  if (uploads.length === 0) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Ionicons
            name={
              allSettled
                ? hasFailed
                  ? 'alert-circle'
                  : 'checkmark-circle'
                : 'cloud-upload'
            }
            size={24}
            color={
              allSettled ? (hasFailed ? colors.error : colors.success) : colors.primary
            }
          />
          <Text style={styles.headerTitle}>
            {allSettled
              ? hasFailed
                ? failedCount === uploads.length
                  ? `Échec du téléversement`
                  : `${completedCount} réussi${completedCount > 1 ? 's' : ''}, ${failedCount} échec${failedCount > 1 ? 's' : ''}`
                : `${completedCount} fichier${completedCount > 1 ? 's' : ''} téléversé${completedCount > 1 ? 's' : ''}`
              : `Téléversement en cours... (${completedCount}/${uploads.length})`}
          </Text>
        </View>
        {allSettled && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {uploads.map((upload) => (
        <View key={upload.id} style={styles.uploadItem}>
          <View style={styles.uploadInfo}>
            <Text style={styles.uploadName} numberOfLines={1}>
              {upload.name}
            </Text>
            {upload.status === 'uploading' && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <Animated.View
                    style={[styles.progressBarFill, { width: `${upload.progress}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{upload.progress}%</Text>
              </View>
            )}
            {upload.status === 'completed' && <Text style={styles.statusText}>Terminé</Text>}
            {upload.status === 'failed' && (
              <Text style={[styles.statusText, { color: colors.error }]}>Échec</Text>
            )}
          </View>
          {upload.status === 'uploading' && (
            <TouchableOpacity onPress={() => onCancel?.(upload.id)} style={styles.actionButton}>
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          )}
          {upload.status === 'failed' && (
            <TouchableOpacity onPress={() => onRetry?.(upload.id)} style={styles.actionButton}>
              <Ionicons name="refresh" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          {upload.status === 'completed' && (
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          )}
        </View>
      ))}
    </Animated.View>
  );
}
