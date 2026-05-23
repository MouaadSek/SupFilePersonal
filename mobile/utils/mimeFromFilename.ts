import type { FileItem } from '@/types';

/** Déduit le MIME à partir de l’extension (plus fiable que certaines réponses HTTP pour le partage / intents). */
export function mimeTypeFromFilename(filename: string): string | undefined {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'text/markdown';
  if (lower.endsWith('.txt')) return 'text/plain';
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.pptx'))
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  return undefined;
}

export function isImageFile(file: FileItem): boolean {
  if (file.type !== 'file') return false;
  const mime = effectiveMimeTypeForFile(file);
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg)$/i.test(file.name);
}

export function isPdfFile(file: FileItem): boolean {
  if (file.type !== 'file') return false;
  const mime = effectiveMimeTypeForFile(file);
  return mime === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isVideoFile(file: FileItem): boolean {
  if (file.type !== 'file') return false;
  const mime = effectiveMimeTypeForFile(file);
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(file.name);
}

export function isAudioFile(file: FileItem): boolean {
  if (file.type !== 'file') return false;
  const mime = effectiveMimeTypeForFile(file);
  if (mime.startsWith('audio/')) return true;
  return /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(file.name);
}

/** Affiche une miniature (images) ou une pastille extension (PDF, vidéo, audio, etc.). */
export function supportsImageThumbnail(file: FileItem): boolean {
  return isImageFile(file);
}

/** Extension affichée dans les listes (ex. PDF, DOCX). */
export function fileExtensionLabel(filename: string): string {
  const base = filename.trim();
  const i = base.lastIndexOf('.');
  if (i <= 0 || i >= base.length - 1) return 'FILE';
  const ext = base.slice(i + 1).replace(/[^a-zA-Z0-9]/g, '');
  if (!ext) return 'FILE';
  return ext.length > 6 ? ext.slice(0, 6).toUpperCase() : ext.toUpperCase();
}

export function hasRemotePreviewSource(file: FileItem): boolean {
  return !!(file.localUri || file.previewUrl || file.downloadUrl || file.thumbnail);
}

/** MIME utilisé pour partage / intent Android : extension prioritaire sur le type stocké. */
export function effectiveMimeTypeForFile(file: FileItem): string {
  const fromName = mimeTypeFromFilename(file.name);
  if (fromName) return fromName;
  return file.mimeType || 'application/octet-stream';
}
