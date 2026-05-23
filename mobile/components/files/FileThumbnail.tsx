import React, { useState, useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import type { FileItem } from '@/types';
import { useCachedMediaUri } from '@/hooks/useCachedMediaUri';
import { isImageFile, hasRemotePreviewSource } from '@/utils/mimeFromFilename';
import { useTheme } from '@/contexts/ThemeContext';
import { fileAuthenticatedPreviewUrl } from '@/services/api/client';

type FileThumbnailProps = {
  item: FileItem;
  style: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  fallback: React.ReactNode;
};

/** Miniature image (liste / grille) avec cache authentifié pour les fichiers serveur. */
export function FileThumbnail({ item, style, containerStyle, fallback }: FileThumbnailProps) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const showThumb = isImageFile(item);

  useEffect(() => {
    setImageFailed(false);
  }, [item.id, item.thumbnail, item.localUri]);
  const authPreview =
    item.type === 'file' && item.id ? fileAuthenticatedPreviewUrl(item.id) : undefined;
  const directUri = showThumb
    ? item.localUri || item.thumbnail || authPreview || null
    : null;
  const cachedUri = useCachedMediaUri(
    showThumb && !item.localUri && !directUri && hasRemotePreviewSource(item) ? item : null,
  );
  const uri = directUri || cachedUri;

  const needsRemote = showThumb && !uri && hasRemotePreviewSource(item) && !item.localUri;

  if (!showThumb || !uri || imageFailed) {
    return (
      <View style={[styles.wrap, containerStyle]}>
        {fallback}
        {needsRemote && !imageFailed ? (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Image
        source={{ uri }}
        style={style}
        resizeMode="cover"
        onError={() => setImageFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
