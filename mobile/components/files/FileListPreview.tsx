import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { Folder } from 'lucide-react-native';
import type { FileItem } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { supportsImageThumbnail } from '@/utils/mimeFromFilename';
import { FileThumbnail } from './FileThumbnail';
import { FileExtensionBadge } from './FileExtensionBadge';

type Size = 'sm' | 'md';

const BOX: Record<Size, number> = { sm: 44, md: 72 };

type Props = {
  item: FileItem;
  size?: Size;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

/** Icône liste / accueil : miniature image ou pastille extension (PDF, MP4, MP3…). */
export function FileListPreview({
  item,
  size = 'sm',
  containerStyle,
  imageStyle,
}: Props) {
  const { colors } = useTheme();
  const box = BOX[size];

  if (item.type === 'folder') {
    return (
      <View
        style={[
          styles.folderBox,
          { width: box, height: box, backgroundColor: colors.primaryLight },
          containerStyle,
        ]}
      >
        <Folder size={size === 'sm' ? 24 : 40} color={colors.primary} />
      </View>
    );
  }

  if (supportsImageThumbnail(item)) {
    return (
      <FileThumbnail
        item={item}
        style={[{ width: box, height: box }, imageStyle]}
        containerStyle={[
          styles.thumbWrap,
          { width: box, height: box, backgroundColor: colors.primaryLight },
          containerStyle,
        ]}
        fallback={<FileExtensionBadge file={item} size={size} />}
      />
    );
  }

  return (
    <FileExtensionBadge
      file={item}
      size={size}
      style={containerStyle}
    />
  );
}

const styles = StyleSheet.create({
  folderBox: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
});
