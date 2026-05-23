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
