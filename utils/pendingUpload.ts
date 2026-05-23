import type { ImagePickerAsset } from 'expo-image-picker';

/** Normalized shape for `uploadFile` / future API multipart uploads */
export type PendingUploadPayload = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

function guessMimeFromFileName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.mp4') || lower.endsWith('.mov')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

export function fromImagePickerAsset(asset: ImagePickerAsset): PendingUploadPayload {
  const uri = asset.uri;
  const isVideo = asset.type === 'video';
  const name =
    asset.fileName ??
    (isVideo ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`);
  const mimeType = asset.mimeType ?? guessMimeFromFileName(name);
  const size = asset.fileSize ?? 0;
  return { uri, name, mimeType, size };
}

export type DocumentPickerLikeAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

export function fromDocumentPickerAsset(asset: DocumentPickerLikeAsset): PendingUploadPayload {
  const name = asset.name?.trim() || `fichier_${Date.now()}`;
  const mimeType = (asset.mimeType && asset.mimeType.length > 0
    ? asset.mimeType
    : guessMimeFromFileName(name)) as string;
  const size = asset.size ?? 0;
  return { uri: asset.uri, name, mimeType, size };
}
