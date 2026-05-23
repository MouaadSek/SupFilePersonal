import { Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import type { FileItem } from '@/types';
import { effectiveMimeTypeForFile } from '@/utils/mimeFromFilename';

async function ensureShareableUri(uri: string): Promise<string> {
  if (Platform.OS === 'android' && uri.startsWith('file:')) {
    return FileSystem.getContentUriAsync(uri);
  }
  return uri;
}

function safeDestName(file: FileItem): string {
  return file.name.replace(/[^\w.\-]+/g, '_').replace(/^\.+/, '') || 'fichier.bin';
}

async function resolveShareableUri(file: FileItem): Promise<string | null> {
  if (file.type !== 'file') return null;
  if (file.localUri) {
    return ensureShareableUri(file.localUri);
  }
  if (file.downloadUrl) {
    const dest = `${FileSystem.cacheDirectory}open_${file.id}_${safeDestName(file)}`;
    const { uri } = await FileSystem.downloadAsync(file.downloadUrl, dest);
    return ensureShareableUri(uri);
  }
  return null;
}

export function canOpenFileExternally(file: FileItem): boolean {
  return file.type === 'file' && !!(file.localUri || file.downloadUrl);
}

/**
 * Ouvre la feuille de partage système (sans forcer ACTION_VIEW / une appli par défaut comme Excel).
 */
export async function shareDocumentFile(file: FileItem): Promise<void> {
  if (file.type !== 'file') return;

  const mime = effectiveMimeTypeForFile(file);

  try {
    const shareUri = await resolveShareableUri(file);
    if (!shareUri) {
      Alert.alert(
        'Partage impossible',
        'Importez le fichier sur l’appareil ou synchronisez-le depuis le serveur (URL de téléchargement) pour le partager.',
      );
      return;
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert(
        'Non disponible',
        'Le partage n’est pas disponible sur cette plateforme.',
      );
      return;
    }

    await Sharing.shareAsync(shareUri, {
      mimeType: mime,
      dialogTitle: `Partager : ${file.name}`,
    });
  } catch {
    Alert.alert('Erreur', 'Impossible de partager le fichier. Réessayez.');
  }
}

/**
 * Ouvre le fichier dans une autre application (Android : ACTION_VIEW + type MIME ;
 * repli sur la feuille de partage ; iOS : partage système, MIME dérivé du nom de fichier).
 */
export async function openDocumentInExternalApp(file: FileItem): Promise<void> {
  if (file.type !== 'file') return;

  const mime = effectiveMimeTypeForFile(file);

  try {
    const shareUri = await resolveShareableUri(file);
    if (!shareUri) {
      Alert.alert(
        'Ouverture impossible',
        'Importez le fichier sur l’appareil ou synchronisez-le depuis le serveur (URL de téléchargement) pour l’ouvrir dans une autre application.',
      );
      return;
    }

    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: shareUri,
          type: mime,
          flags: 1,
        });
        return;
      } catch {
        // Aucune app par défaut ou intent refusé → partage
      }
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert(
        'Non disponible',
        'L’ouverture vers d’autres applications n’est pas disponible sur cette plateforme.',
      );
      return;
    }

    await Sharing.shareAsync(shareUri, {
      mimeType: mime,
      dialogTitle: `Ouvrir : ${file.name}`,
    });
  } catch {
    Alert.alert('Erreur', 'Impossible d’ouvrir le fichier. Réessayez.');
  }
}
