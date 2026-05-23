import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  Share2,
  Download,
  MoreVertical,
  FileText,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  Calendar,
  HardDrive,
  Route,
  FileType,
  Cloud,
  Smartphone,
  ChevronDown,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { WebView } from 'react-native-webview';
import Markdown from 'react-native-markdown-display';
import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';
import { useTheme } from '@/contexts/ThemeContext';
import { useFiles } from '@/contexts/FilesContext';
import type { FileItem } from '@/types';
import { formatFileSize, formatDate } from '@/data/mockData';
import { FontSize, Spacing, BorderRadius, Colors } from '@/constants/theme';
import { effectiveMimeTypeForFile, isImageFile, fileExtensionLabel } from '@/utils/mimeFromFilename';
import { FileExtensionBadge } from '@/components/files/FileExtensionBadge';
import { Button } from '@/components/ui';
import { AppBackButton } from '@/components/navigation';
import { RenameModal } from '@/components/files';
import {
  canOpenFileExternally,
  openDocumentInExternalApp,
  shareDocumentFile,
} from '@/utils/openDocumentInExternalApp';
import { fetchPdfAsInlineDataUri } from '@/utils/pdfInlineDataUri';
import { buildPdfJsViewerHtml, loadPdfBase64 } from '@/utils/pdfPreview';
import { fileAuthenticatedPreviewUrl } from '@/services/api/client';
import { loadSpreadsheetRows, spreadsheetRowsToHtml } from '@/utils/spreadsheetFromFile';
import { shareSingleFileToDevice } from '@/utils/folderArchiveDownload';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function isHttpsUrl(url: string): boolean {
  return url.startsWith('https://');
}

function officeEmbedUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

/** Répertoire parent d’un fichier `file://…` (requis pour `allowingReadAccessToURL` sur iOS). */
function parentDirectoryOfFileUri(fileUri: string): string | undefined {
  if (!fileUri.startsWith('file:')) return undefined;
  const clean = fileUri.split('?')[0];
  const idx = clean.lastIndexOf('/');
  if (idx <= 'file://'.length) return undefined;
  return clean.slice(0, idx + 1);
}

function PdfPreview({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const [webSource, setWebSource] = useState<
    { uri: string } | { html: string; baseUrl?: string } | null
  >(null);
  const [iosReadAccessUrl, setIosReadAccessUrl] = useState<string | undefined>();
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setWebSource(null);

    (async () => {
      try {
        if (Platform.OS === 'web') {
          if (!cancelled) setWebSource({ uri });
          return;
        }

        /* Android WebView has no PDF renderer — paint pages with pdf.js inside HTML. */
        if (Platform.OS === 'android') {
          const b64 = await loadPdfBase64(uri);
          if (!cancelled) {
            setWebSource({ html: buildPdfJsViewerHtml(b64), baseUrl: 'https://localhost' });
            setIosReadAccessUrl(undefined);
          }
          return;
        }

        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          try {
            const dataUri = await fetchPdfAsInlineDataUri(uri);
            if (!cancelled) {
              setWebSource({ uri: dataUri });
              setIosReadAccessUrl(undefined);
            }
          } catch {
            if (!cancelled) {
              setWebSource({ uri });
              setIosReadAccessUrl(undefined);
            }
          }
          return;
        }

        if (Platform.OS === 'ios') {
          if (!cancelled) {
            setWebSource({ uri });
            setIosReadAccessUrl(
              parentDirectoryOfFileUri(uri) ?? FileSystem.cacheDirectory ?? undefined,
            );
          }
          return;
        }

        if (uri.startsWith('file:')) {
          const b64 = await FileSystem.readAsStringAsync(uri, { encoding: EncodingType.Base64 });
          if (!cancelled) {
            setWebSource({ uri: `data:application/pdf;base64,${b64}` });
            setIosReadAccessUrl(undefined);
          }
        } else if (!cancelled) {
          setWebSource({ uri });
          setIosReadAccessUrl(undefined);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (loadError) {
    return (
      <View style={[styles.embedWebView, { backgroundColor: colors.background }]}>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          Impossible d’afficher ce PDF. Vérifiez votre connexion ou ouvrez-le avec une autre application.
        </Text>
      </View>
    );
  }

  if (!webSource) {
    return (
      <View style={[styles.embedWebView, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.centeredLoader} color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.pdfDocumentFrame, { backgroundColor: colors.surface }]}>
      <WebView
        source={webSource}
        style={[styles.pdfWebViewInner, { backgroundColor: '#525659' }]}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        startInLoadingState
        allowingReadAccessToURL={iosReadAccessUrl}
        allowFileAccess
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        renderLoading={() => (
          <ActivityIndicator style={styles.centeredLoader} color={colors.primary} size="large" />
        )}
      />
    </View>
  );
}

function OfficeOnlinePreview({ fileUrl }: { fileUrl: string }) {
  const { colors } = useTheme();
  const embed = officeEmbedUrl(fileUrl);
  return (
    <WebView
      source={{ uri: embed }}
      style={[styles.embedWebView, { backgroundColor: colors.background }]}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      renderLoading={() => (
        <ActivityIndicator style={styles.centeredLoader} color={colors.primary} size="large" />
      )}
    />
  );
}

function SpreadsheetInlinePreview({ file }: { file: FileItem }) {
  const { colors } = useTheme();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadSpreadsheetRows(file);
        if (cancelled) return;
        setHtml(
          spreadsheetRowsToHtml(rows, {
            bg: colors.background,
            text: colors.text,
            border: colors.border,
            headerBg: colors.surfaceSecondary,
          }),
        );
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, colors.background, colors.text, colors.border, colors.surfaceSecondary]);

  if (error) {
    return (
      <ScrollView style={styles.documentContainer} contentContainerStyle={styles.documentContent}>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          Impossible d’afficher ce classeur dans l’application. Vérifiez la connexion ou le format du
          fichier.
        </Text>
        {canOpenFileExternally(file) ? (
          <View style={{ marginTop: Spacing.lg }}>
            <Button
              title="Ouvrir avec une application"
              onPress={() => void openDocumentInExternalApp(file)}
              fullWidth
              icon={<ExternalLink size={18} color={colors.white} />}
            />
          </View>
        ) : null}
      </ScrollView>
    );
  }

  if (html === null) {
    return (
      <View style={[styles.embedWebView, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.centeredLoader} color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <WebView
      source={{ html }}
      style={[styles.embedWebView, { backgroundColor: colors.background }]}
      originWhitelist={['*']}
      javaScriptEnabled={false}
      scrollEnabled
      nestedScrollEnabled
    />
  );
}

function VideoNativePreview({ uri }: { uri: string }) {
  const errorAlerted = useRef(false);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    errorAlerted.current = false;
  }, [uri]);

  useEventListener(player, 'statusChange', ({ error }) => {
    if (error && !errorAlerted.current) {
      errorAlerted.current = true;
      Alert.alert('Lecture', 'Impossible de lire cette vidéo sur cet appareil.');
    }
  });

  const isRemote = uri.startsWith('http://') || uri.startsWith('https://');

  return (
    <View style={[styles.mediaBox, { backgroundColor: '#000000' }]}>
      {isRemote ? (
        <View style={styles.videoHintBar}>
          <Text style={styles.videoHintText}>Streaming — lecture directe dans l’app</Text>
        </View>
      ) : null}
      <VideoView
        style={styles.video}
        player={player}
        nativeControls
        contentFit="contain"
        allowsFullscreen
      />
    </View>
  );
}

function formatPlaybackTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioNativePreview({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s) => {
          if (s.isLoaded) {
            setPlaying(s.isPlaying);
            setPositionMs(s.positionMillis ?? 0);
            setDurationMs(s.durationMillis ?? 0);
          }
        });
      } catch {
        Alert.alert('Audio', 'Impossible de charger ce fichier audio.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [uri]);

  const toggle = async () => {
    const s = soundRef.current;
    if (!s) return;
    const st = await s.getStatusAsync();
    if (st.isLoaded) {
      if (st.isPlaying) await s.pauseAsync();
      else await s.playAsync();
    }
  };

  const progress =
    durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0;
  const isRemote = uri.startsWith('http://') || uri.startsWith('https://');

  return (
    <View style={[styles.audioBox, { backgroundColor: colors.surface }]}>
      <View style={[styles.audioArt, { backgroundColor: colors.primaryLight }]}>
        <Volume2 size={56} color={colors.primary} />
      </View>
      {isRemote ? (
        <Text style={[styles.streamingHint, { color: colors.textSecondary }]}>
          Lecture en streaming — aucun téléchargement requis
        </Text>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.lg }} />
      ) : (
        <>
          <View style={[styles.audioProgressTrack, { backgroundColor: colors.borderLight }]}>
            <View
              style={[styles.audioProgressFill, { width: `${progress}%`, backgroundColor: colors.primary }]}
            />
          </View>
          <View style={styles.audioTimeRow}>
            <Text style={[styles.audioTimeText, { color: colors.textSecondary }]}>
              {formatPlaybackTime(positionMs)}
            </Text>
            <Text style={[styles.audioTimeText, { color: colors.textSecondary }]}>
              {formatPlaybackTime(durationMs)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.audioPlayBtn, { backgroundColor: colors.primary }]}
            onPress={() => void toggle()}
          >
            {playing ? (
              <Pause size={32} color={colors.white} />
            ) : (
              <Play size={32} color={colors.white} />
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function ImageFullPreview({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(true);
  return (
    <View style={[styles.mediaBox, { backgroundColor: colors.background }]}>
      {busy ? (
        <View style={styles.imageLoaderOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
      <Image
        source={{ uri }}
        style={styles.fullImage}
        resizeMode="contain"
        onLoadStart={() => setBusy(true)}
        onLoadEnd={() => setBusy(false)}
        onError={() => setBusy(false)}
      />
    </View>
  );
}

type ThemePalette = (typeof Colors)['light'];

function imageUriForFile(f: FileItem): string | null {
  return (
    f.localUri ||
    f.thumbnail ||
    (f.id ? fileAuthenticatedPreviewUrl(f.id) : undefined) ||
    f.previewUrl ||
    f.downloadUrl ||
    null
  );
}

function ImageGalleryPreview({
  file,
  galleryFiles,
  colors,
  onFocusFile,
}: {
  file: FileItem;
  galleryFiles: FileItem[];
  colors: ThemePalette;
  onFocusFile: (f: FileItem) => void;
}) {
  const [current, setCurrent] = useState(file);

  useEffect(() => {
    setCurrent(file);
    onFocusFile(file);
  }, [file.id, file, onFocusFile]);

  const pick = (f: FileItem) => {
    setCurrent(f);
    onFocusFile(f);
  };

  const mainUri = imageUriForFile(current);
  if (!mainUri) {
    return (
      <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
        Aucune image disponible.
      </Text>
    );
  }

  const showStrip = galleryFiles.length > 1;

  return (
    <View style={styles.galleryRoot}>
      <View style={styles.galleryMain}>
        <ImageFullPreview uri={mainUri} />
      </View>
      {showStrip ? (
        <View style={[styles.galleryStrip, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.galleryStripTitle, { color: colors.textSecondary }]}>
            Galerie du dossier
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryStripContent}
          >
            {galleryFiles.map((gf) => {
              const u = imageUriForFile(gf);
              if (!u) return null;
              const selected = gf.id === current.id;
              return (
                <TouchableOpacity
                  key={gf.id}
                  onPress={() => pick(gf)}
                  style={[
                    styles.galleryThumbWrap,
                    { borderColor: selected ? colors.primary : colors.border },
                    selected && { backgroundColor: colors.primaryLight },
                  ]}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={gf.name}
                >
                  <Image source={{ uri: u }} style={styles.galleryThumb} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function TextOrMarkdownPreview({ file }: { file: FileItem }) {
  const { colors } = useTheme();
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (file.localUri) {
          const t = await FileSystem.readAsStringAsync(file.localUri);
          if (alive) setText(t);
          return;
        }
        const remote = file.downloadUrl || file.previewUrl;
        if (remote) {
          const { fetchWithAuth } = await import('@/utils/authenticatedFetch');
          const res = await fetchWithAuth(remote);
          const t = await res.text();
          if (alive) setText(t);
          return;
        }
        if (alive) setText('');
      } catch {
        if (alive) setErr(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [file]);

  if (err) {
    return (
      <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
        Impossible de charger le texte de ce fichier.
      </Text>
    );
  }
  if (text === null) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xxl }} />;
  }

  const isMd =
    effectiveMimeTypeForFile(file) === 'text/markdown' ||
    file.name.toLowerCase().endsWith('.md');

  if (isMd) {
    return (
      <ScrollView style={styles.textScroll} contentContainerStyle={styles.textScrollContent}>
        <Markdown
          style={{
            body: { color: colors.text, fontSize: FontSize.md },
            heading1: { color: colors.text, fontWeight: '700' },
            heading2: { color: colors.text, fontWeight: '700' },
            link: { color: colors.primary },
            code_inline: { backgroundColor: colors.surfaceSecondary, color: colors.text },
            fence: { backgroundColor: colors.surfaceSecondary, color: colors.text },
          }}
        >
          {text}
        </Markdown>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.textScroll} contentContainerStyle={styles.textScrollContent}>
      <Text style={[styles.plainText, { color: colors.text }]} selectable>
        {text}
      </Text>
    </ScrollView>
  );
}

function previewKind(file: FileItem): string {
  const mt = effectiveMimeTypeForFile(file);
  const lower = file.name.toLowerCase();

  if (mt.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg)$/i.test(lower)) {
    return 'image';
  }
  if (mt.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v)$/i.test(lower)) return 'video';
  if (mt.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|aac)$/i.test(lower)) return 'audio';
  if (mt === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (
    mt.includes('spreadsheet') ||
    mt.includes('excel') ||
    /\.xlsx?$/i.test(lower) ||
    lower.endsWith('.csv')
  ) {
    return 'sheet';
  }
  if (mt.includes('wordprocessing') || mt.includes('msword') || /\.docx?$/i.test(lower)) {
    return 'word';
  }
  if (mt === 'text/markdown' || lower.endsWith('.md')) return 'markdown';
  if (mt === 'text/plain' || lower.endsWith('.txt')) return 'plaintext';
  return 'other';
}

function streamUri(file: FileItem): string | null {
  return (
    file.localUri ||
    (file.id ? fileAuthenticatedPreviewUrl(file.id) : undefined) ||
    file.previewUrl ||
    file.downloadUrl ||
    null
  );
}

function PreviewMetaPanel({
  file,
  resolvedBytes,
  colors,
  variant = 'standalone',
}: {
  file: FileItem;
  resolvedBytes?: number | null;
  colors: ThemePalette;
  variant?: 'standalone' | 'embedded';
}) {
  const mime = effectiveMimeTypeForFile(file);
  const sizeBytes = resolvedBytes ?? file.size ?? 0;

  const rows: { Icon: typeof FileType; label: string; value: string }[] = [
    { Icon: FileType, label: 'Type MIME', value: mime },
    { Icon: HardDrive, label: 'Taille', value: formatFileSize(sizeBytes) },
    { Icon: Calendar, label: 'Modifié le', value: formatDate(file.modifiedAt) },
  ];

  if (file.createdAt) {
    rows.push({
      Icon: Calendar,
      label: 'Créé le',
      value: formatDate(file.createdAt),
    });
  }

  rows.push({
    Icon: Route,
    label: 'Emplacement',
    value: file.path?.length ? file.path : '—',
  });

  const source =
    file.localUri && file.downloadUrl
      ? 'Appareil et lien distant'
      : file.localUri
        ? 'Copie locale'
        : file.downloadUrl
          ? 'Lien distant (streaming)'
          : 'Métadonnées uniquement';

  return (
    <View
      style={[
        styles.metaCard,
        variant === 'embedded' && styles.metaCardEmbedded,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {variant === 'standalone' ? (
        <>
          <Text style={[styles.metaCardTitle, { color: colors.text }]}>Détails techniques</Text>
          <Text style={[styles.metaCardSub, { color: colors.textSecondary }]}>
            Données du fichier tel qu’il est enregistré dans votre espace.
          </Text>
        </>
      ) : (
        <Text style={[styles.metaCardSub, { color: colors.textSecondary, marginBottom: Spacing.md }]}>
          Données du fichier tel qu’il est enregistré dans votre espace.
        </Text>
      )}
      {rows.map(({ Icon, label, value }) => (
        <View key={label} style={[styles.metaRow, { borderBottomColor: colors.borderLight }]}>
          <View style={styles.metaRowLeft}>
            <Icon size={18} color={colors.primary} />
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
          </View>
          <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={4}>
            {value}
          </Text>
        </View>
      ))}
      <View style={[styles.metaSourceRow, { backgroundColor: colors.surfaceSecondary }]}>
        {file.downloadUrl ? (
          <Cloud size={16} color={colors.primary} />
        ) : (
          <Smartphone size={16} color={colors.primary} />
        )}
        <Text style={[styles.metaSourceText, { color: colors.textSecondary }]}>Source : {source}</Text>
      </View>
      <Text style={[styles.metaFootnote, { color: colors.textTertiary }]}>
        Consultation directe dans l’app. Partager ou enregistrer reste optionnel.
      </Text>
    </View>
  );
}

export default function PreviewScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFileById, ensureFileInIndex, renameItem, files } = useFiles();
  const file = getFileById(id);

  useEffect(() => {
    if (id && !getFileById(id)) {
      void ensureFileInIndex(id);
    }
  }, [id, getFileById, ensureFileInIndex]);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [galleryDisplayFile, setGalleryDisplayFile] = useState<FileItem | null>(null);
  const [resolvedFsBytes, setResolvedFsBytes] = useState<number | null>(null);
  const [technicalDetailsExpanded, setTechnicalDetailsExpanded] = useState(false);

  const kind = file ? previewKind(file) : 'other';

  const imageGalleryFiles = useMemo(() => {
    if (!file || kind !== 'image') return [];
    return files
      .filter(
        (f) =>
          !f.deletedAt &&
          f.parentId === file.parentId &&
          f.type === 'file' &&
          isImageFile(f),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [file, files, kind]);

  useEffect(() => {
    setGalleryDisplayFile(null);
    setTechnicalDetailsExpanded(false);
  }, [file?.id]);

  useEffect(() => {
    if (!file) {
      setResolvedFsBytes(null);
      return;
    }
    const target =
      kind === 'image' && galleryDisplayFile ? galleryDisplayFile : file;
    const localUri = target.localUri;
    if (!localUri) {
      setResolvedFsBytes(null);
      return;
    }
    let alive = true;
    void FileSystem.getInfoAsync(localUri).then((info) => {
      if (!alive || !info.exists || typeof info.size !== 'number') return;
      setResolvedFsBytes(info.size);
    });
    return () => {
      alive = false;
    };
  }, [file, kind, galleryDisplayFile]);

  const displayFile: FileItem | undefined =
    !file ? undefined : kind === 'image' && galleryDisplayFile ? galleryDisplayFile : file;

  const openRename = useCallback(() => {
    const f = getFileById(id);
    if (!f) return;
    const k = previewKind(f);
    const target = k === 'image' && galleryDisplayFile ? galleryDisplayFile : f;
    setRenameTarget(target);
    setRenameVisible(true);
  }, [id, getFileById, galleryDisplayFile]);

  const handleRenameSubmit = useCallback(
    async (newName: string) => {
      if (renameTarget) {
        await renameItem(renameTarget.id, newName);
        setRenameVisible(false);
        setRenameTarget(null);
      }
    },
    [renameItem, renameTarget],
  );

  const renderGenericDocument = useCallback(() => {
    if (!file) return null;
    return (
      <ScrollView style={styles.documentContainer} contentContainerStyle={styles.documentContent}>
        <View style={[styles.documentHeader, { backgroundColor: colors.primaryLight }]}>
          <FileExtensionBadge file={file} size="lg" />
          <Text style={[styles.documentExtHint, { color: colors.textSecondary }]}>
            Fichier {fileExtensionLabel(file.name)}
          </Text>
        </View>
        {canOpenFileExternally(file) ? (
          <View style={[styles.openExternalBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.openExternalHint, { color: colors.textSecondary }]}>
              Ouvrez ce fichier dans une application installée sur votre téléphone (Excel, Word, etc.).
            </Text>
            <Button
              title="Ouvrir avec une application"
              onPress={() => void openDocumentInExternalApp(file)}
              fullWidth
              icon={<ExternalLink size={18} color={colors.white} />}
            />
          </View>
        ) : (
          <View style={[styles.openExternalBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.openExternalHint, { color: colors.textSecondary }]}>
              Importez le fichier ou ajoutez une URL de téléchargement côté serveur pour l’ouvrir ailleurs.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }, [file, colors]);

  if (!file) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Fichier non trouve</Text>
          <AppBackButton style={{ marginTop: Spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  const uiFile = displayFile!;

  const uri = streamUri(file);

  const renderPreview = () => {
    if (kind === 'image') {
      return (
        <ImageGalleryPreview
          file={file}
          galleryFiles={imageGalleryFiles}
          colors={colors}
          onFocusFile={setGalleryDisplayFile}
        />
      );
    }

    if (kind === 'video') {
      if (!uri) {
        return (
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
            Vidéo non disponible hors ligne.
          </Text>
        );
      }
      return <VideoNativePreview uri={uri} />;
    }

    if (kind === 'audio') {
      if (!uri) {
        return (
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
            Audio non disponible hors ligne.
          </Text>
        );
      }
      return <AudioNativePreview uri={uri} />;
    }

    if (kind === 'pdf') {
      if (!uri) {
        return (
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
            PDF non disponible.
          </Text>
        );
      }
      return <PdfPreview uri={uri} />;
    }

    if (kind === 'sheet' && (file.localUri || file.downloadUrl || file.previewUrl)) {
      return <SpreadsheetInlinePreview file={file} />;
    }

    if (kind === 'word' && file.downloadUrl && isHttpsUrl(file.downloadUrl)) {
      return <OfficeOnlinePreview fileUrl={file.downloadUrl} />;
    }

    if (kind === 'markdown' || kind === 'plaintext') {
      if (!file.localUri && !file.downloadUrl && !file.previewUrl) {
        return renderGenericDocument();
      }
      const label = kind === 'markdown' ? 'Markdown' : 'Texte brut';
      return (
        <View
          style={[
            styles.documentReaderFrame,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <View style={[styles.documentReaderBar, { backgroundColor: colors.surfaceSecondary }]}>
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.documentReaderBarText, { color: colors.textSecondary }]}>
              Visionneuse · {label}
            </Text>
          </View>
          <View style={styles.documentReaderBody}>
            <TextOrMarkdownPreview file={file} />
          </View>
        </View>
      );
    }

    if (kind === 'sheet' || kind === 'word') {
      return renderGenericDocument();
    }

    return renderGenericDocument();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        ]}
      >
        <AppBackButton style={styles.headerButton} />
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {uiFile.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            Aperçu intégré · sans téléchargement obligatoire
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (canOpenFileExternally(uiFile)) {
                void shareDocumentFile(uiFile);
              } else {
                Alert.alert(
                  'Partage',
                  'Importez le fichier ou synchronisez-le pour pouvoir le partager.',
                );
              }
            }}
          >
            <Share2 size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => void shareSingleFileToDevice(uiFile)}
          >
            <Download size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={openRename}>
            <MoreVertical size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <RenameModal
        visible={renameVisible}
        onClose={() => {
          setRenameVisible(false);
          setRenameTarget(null);
        }}
        onSubmit={handleRenameSubmit}
        file={renameTarget}
      />

      <View style={styles.bodyColumn}>
        <View style={styles.previewContainer}>{renderPreview()}</View>
        {technicalDetailsExpanded ? (
          <ScrollView
            style={[
              styles.detailsPanelScroll,
              { maxHeight: Math.min(screenHeight * 0.42, 340), borderTopColor: colors.border },
            ]}
            contentContainerStyle={styles.detailsPanelScrollContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <PreviewMetaPanel
              file={uiFile}
              resolvedBytes={resolvedFsBytes}
              colors={colors}
              variant="embedded"
            />
          </ScrollView>
        ) : null}
        <View
          style={[
            styles.detailsHandleOuter,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.detailsHandle}
            onPress={() => setTechnicalDetailsExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: technicalDetailsExpanded }}
            accessibilityLabel={
              technicalDetailsExpanded
                ? 'Masquer les détails techniques'
                : 'Afficher les détails techniques'
            }
          >
            <FileType size={18} color={colors.primary} />
            <Text style={[styles.detailsHandleTitle, { color: colors.text }]}>
              Détails techniques
            </Text>
            <ChevronDown
              size={22}
              color={colors.textSecondary}
              style={{
                transform: [{ rotate: technicalDetailsExpanded ? '180deg' : '0deg' }],
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerTitleBlock: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  bodyColumn: {
    flex: 1,
  },
  previewContainer: {
    flex: 1,
    minHeight: 120,
  },
  detailsPanelScroll: {
    flexGrow: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailsPanelScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  detailsHandleOuter: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailsHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  detailsHandleTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSize.lg,
    marginBottom: Spacing.sm,
  },
  mediaBox: {
    flex: 1,
    justifyContent: 'center',
  },
  imageLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  video: {
    flex: 1,
    width: screenWidth,
    minHeight: screenHeight * 0.38,
  },
  fullImage: {
    flex: 1,
    width: screenWidth,
    minHeight: screenHeight * 0.35,
  },
  centeredLoader: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    zIndex: 2,
  },
  embedWebView: {
    flex: 1,
    width: screenWidth,
  },
  pdfDocumentFrame: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pdfWebViewInner: {
    flex: 1,
    width: '100%',
  },
  audioBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  audioArt: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  audioPlayBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textScroll: {
    flex: 1,
  },
  textScrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  plainText: {
    fontSize: FontSize.md,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fallbackText: {
    textAlign: 'center',
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    fontSize: FontSize.md,
  },
  documentContainer: {
    flex: 1,
  },
  documentContent: {
    padding: Spacing.xl,
  },
  documentHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  documentExtHint: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  openExternalBlock: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  openExternalHint: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  metaCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaCardEmbedded: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
  },
  metaCardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  metaCardSub: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  metaRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minWidth: 110,
  },
  metaLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  metaValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  metaSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  metaSourceText: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  metaFootnote: {
    fontSize: FontSize.xs,
    lineHeight: 16,
    marginTop: Spacing.md,
  },
  galleryRoot: {
    flex: 1,
  },
  galleryMain: {
    flex: 1,
    minHeight: screenHeight * 0.32,
  },
  galleryStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  galleryStripTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  galleryStripContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  galleryThumbWrap: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    overflow: 'hidden',
    marginRight: Spacing.sm,
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
  },
  documentReaderFrame: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  documentReaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  documentReaderBarText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  documentReaderBody: {
    flex: 1,
    minHeight: 120,
  },
  streamingHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  audioProgressTrack: {
    width: '100%',
    maxWidth: 280,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  audioProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  audioTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 280,
    marginBottom: Spacing.lg,
  },
  audioTimeText: {
    fontSize: FontSize.xs,
    fontVariant: ['tabular-nums'],
  },
  videoHintBar: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  videoHintText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
});
