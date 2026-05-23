export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? "A l'instant" : `Il y a ${minutes} min`;
    }
    return hours === 1 ? 'Il y a 1 heure' : `Il y a ${hours} heures`;
  }
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function getFileColor(mimeType?: string): string {
  if (!mimeType) return '#30a8fe';
  if (mimeType.startsWith('image/')) return '#10b981';
  if (mimeType.startsWith('video/')) return '#ef4444';
  if (mimeType.startsWith('audio/')) return '#f59e0b';
  if (mimeType === 'application/pdf') return '#ef4444';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '#10b981';
  if (mimeType.includes('document') || mimeType.includes('word')) return '#3b82f6';
  return '#64748b';
}

export function getFileIcon(mimeType?: string): string {
  if (!mimeType) return 'folder';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'music';
  if (mimeType === 'application/pdf') return 'file-text';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'file-text';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType === 'text/plain' || mimeType === 'text/markdown') return 'file-text';
  return 'file';
}
