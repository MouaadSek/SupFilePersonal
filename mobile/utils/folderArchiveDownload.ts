import { Alert, Platform } from 'react-native';
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { FileItem } from '@/types';
import { isActive } from '@/utils/fileTree';
import { getAuthToken } from '@/services/api/client';
import { fetchServerFolderZipUrl } from '@/services/storageApi';
import { effectiveMimeTypeForFile } from '@/utils/mimeFromFilename';

/** Limite par fichier dans le ZIP (évite OOM / timeouts sur mobile). Les gros fichiers sont décrits dans un .txt */
const MAX_ZIP_ENTRY_BYTES = 12 * 1024 * 1024;

function safeZipName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\.+$/, '') || 'dossier';
}

function safeZipPathSegment(name: string): string {
  return name.replace(/[/\\]/g, '_').replace(/\.\.+/g, '.');
}

/** Encode un ZIP binaire en base64 par blocs (évite stack overflow / limites Hermes). */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x4000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(sub));
  }
  return btoa(binary);
}

type ZipEntry = { pathInZip: string; file: FileItem };

function collectZipEntries(folder: FileItem, all: FileItem[]): ZipEntry[] {
  const out: ZipEntry[] = [];
  const walk = (parentId: string, prefix: string) => {
    const children = all
      .filter((f) => isActive(f) && f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    for (const c of children) {
      const seg = `${prefix}/${safeZipPathSegment(c.name)}`.replace(/^\/+/, '');
      if (c.type === 'file') out.push({ pathInZip: seg, file: c });
      else walk(c.id, seg);
    }
  };
  walk(folder.id, safeZipName(folder.name));
  return out;
}

async function addFileToZip(zip: JSZip, pathInZip: string, file: FileItem): Promise<void> {
  const normalized = pathInZip.replace(/^\/+/, '').replace(/\\/g, '/');
  const tooLargeNote = (bytes: number) =>
    `Fichier non inclus dans l’archive (approx. ${(bytes / (1024 * 1024)).toFixed(1)} Mo, limite ${MAX_ZIP_ENTRY_BYTES / (1024 * 1024)} Mo sur l’appareil). Utilisez l’archive côté serveur pour les gros médias.`;

  try {
    if (file.size != null && file.size > MAX_ZIP_ENTRY_BYTES) {
      zip.file(`${normalized}.txt`, tooLargeNote(file.size));
      return;
    }

    if (file.localUri) {
      const info = await FileSystem.getInfoAsync(file.localUri);
      if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > MAX_ZIP_ENTRY_BYTES) {
        zip.file(`${normalized}.txt`, tooLargeNote(info.size));
        return;
      }
      const b64 = await FileSystem.readAsStringAsync(file.localUri, { encoding: EncodingType.Base64 });
      zip.file(normalized, b64, { base64: true });
      return;
    }

    if (file.downloadUrl) {
      const res = await fetch(file.downloadUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_ZIP_ENTRY_BYTES) {
        zip.file(`${normalized}.txt`, tooLargeNote(buf.byteLength));
        return;
      }
      zip.file(normalized, new Uint8Array(buf));
      return;
    }

    zip.file(
      `${normalized}.txt`,
      'Ce fichier n’a pas d’URL de téléchargement ni de copie locale ; il ne figure pas dans l’archive.',
    );
  } catch {
    zip.file(
      `${normalized}.erreur.txt`,
      'Impossible d’inclure ce fichier dans l’archive (réseau ou accès fichier).',
    );
  }
}

/**
 * Télécharge ou partage une archive du dossier : URL serveur si disponible, sinon ZIP généré localement.
 */
export async function shareFolderZipArchive(folder: FileItem, allFiles: FileItem[]): Promise<void> {
  if (folder.type !== 'folder') return;

  if (Platform.OS === 'web') {
    Alert.alert('Archive', 'La génération ZIP sur le web n’est pas prise en charge. Utilisez l’app iOS ou Android.');
    return;
  }

  const baseDir = FileSystem.cacheDirectory;
  if (!baseDir) {
    Alert.alert('Archive', 'Répertoire cache indisponible sur cet appareil.');
    return;
  }

  const serverUrl = await fetchServerFolderZipUrl(folder.id);
  if (serverUrl) {
    try {
      const dest = `${baseDir}archive_${folder.id}_${Date.now()}.zip`;
      const token = getAuthToken();
      const { uri } = await FileSystem.downloadAsync(serverUrl, dest, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Partage', 'Le partage de fichiers n’est pas disponible sur cet appareil.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/zip',
        dialogTitle: `Archive : ${folder.name}`,
      });
    } catch {
      Alert.alert('Erreur', 'Impossible de récupérer l’archive depuis le serveur.');
    }
    return;
  }

  const entries = collectZipEntries(folder, allFiles);
  if (entries.length === 0) {
    Alert.alert('Archive', 'Ce dossier ne contient aucun fichier à inclure dans le ZIP.');
    return;
  }

  try {
    const zip = new JSZip();
    for (const { pathInZip, file } of entries) {
      await addFileToZip(zip, pathInZip, file);
    }

    const bytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      streamFiles: false,
    });

    const b64 = uint8ArrayToBase64(bytes);
    const outPath = `${baseDir}archive_${safeZipName(folder.name)}_${Date.now()}.zip`;
    await FileSystem.writeAsStringAsync(outPath, b64, {
      encoding: EncodingType.Base64,
    });

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Partage', 'Le partage de fichiers n’est pas disponible sur cet appareil.');
      return;
    }

    let shareUri = outPath;
    if (Platform.OS === 'android' && shareUri.startsWith('file:')) {
      shareUri = await FileSystem.getContentUriAsync(shareUri);
    }

    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/zip',
      dialogTitle: `ZIP : ${folder.name}`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    Alert.alert('Erreur', `Impossible de générer l’archive ZIP.\n${msg}`);
  }
}

/** Télécharge / copie un fichier unique vers le cache puis ouvre la feuille de partage (sauvegarde). */
export async function shareSingleFileToDevice(file: FileItem): Promise<void> {
  if (file.type !== 'file') return;

  const mime = effectiveMimeTypeForFile(file);

  try {
    let shareUri: string;

    if (file.localUri) {
      shareUri = file.localUri;
      if (Platform.OS === 'android' && shareUri.startsWith('file:')) {
        shareUri = await FileSystem.getContentUriAsync(shareUri);
      }
    } else if (file.downloadUrl) {
      const baseDir = FileSystem.cacheDirectory;
      if (!baseDir) {
        Alert.alert('Téléchargement', 'Stockage cache indisponible.');
        return;
      }
      const safe = file.name.replace(/[^\w.\-]+/g, '_') || 'fichier';
      const dest = `${baseDir}dl_${file.id}_${safe}`;
      const { uri } = await FileSystem.downloadAsync(file.downloadUrl, dest);
      shareUri =
        Platform.OS === 'android' && uri.startsWith('file:')
          ? await FileSystem.getContentUriAsync(uri)
          : uri;
    } else {
      Alert.alert(
        'Téléchargement',
        'Ce fichier n’a pas d’URL ni de copie locale : impossible de le télécharger.',
      );
      return;
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Partage', 'Le partage n’est pas disponible sur cet appareil.');
      return;
    }

    await Sharing.shareAsync(shareUri, {
      mimeType: mime,
      dialogTitle: `Fichier : ${file.name}`,
    });
  } catch {
    Alert.alert('Erreur', 'Impossible de préparer le fichier pour le téléchargement.');
  }
}
