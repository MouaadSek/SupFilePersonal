import type { FileItem } from '@/types';
import { effectiveMimeTypeForFile } from '@/utils/mimeFromFilename';

export type SearchFileTypeFilter = 'all' | 'folder' | 'image' | 'video' | 'audio' | 'document';

/** `week` = 7 derniers jours ; `lastWeek` = entre 7 et 14 jours */
export type SearchDateFilter = 'all' | 'today' | 'week' | 'lastWeek' | 'month' | 'year';

export function matchesSearchFileType(file: FileItem, selectedType: SearchFileTypeFilter): boolean {
  if (selectedType === 'all') return true;
  if (selectedType === 'folder') return file.type === 'folder';
  if (file.type === 'folder') return false;
  const mime = effectiveMimeTypeForFile(file);
  if (selectedType === 'image') return mime.startsWith('image/');
  if (selectedType === 'video') return mime.startsWith('video/');
  if (selectedType === 'audio') return mime.startsWith('audio/');
  if (selectedType === 'document') {
    return (
      mime.startsWith('text/') ||
      mime === 'application/pdf' ||
      mime.includes('document') ||
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      mime.includes('presentation') ||
      mime.includes('wordprocessing') ||
      /\.(pdf|docx?|xlsx?|pptx?|csv|txt|md)$/i.test(file.name)
    );
  }
  return true;
}

export function matchesSearchDate(file: FileItem, selectedDate: SearchDateFilter): boolean {
  if (selectedDate === 'all') return true;
  const fileDate = file.modifiedAt;
  const now = new Date();
  const diffMs = now.getTime() - fileDate.getTime();
  const days = diffMs / (1000 * 60 * 60 * 24);

  switch (selectedDate) {
    case 'today':
      return (
        fileDate.getDate() === now.getDate() &&
        fileDate.getMonth() === now.getMonth() &&
        fileDate.getFullYear() === now.getFullYear()
      );
    case 'week':
      return days >= 0 && days < 7;
    case 'lastWeek':
      return days >= 7 && days < 14;
    case 'month':
      return fileDate.getMonth() === now.getMonth() && fileDate.getFullYear() === now.getFullYear();
    case 'year':
      return fileDate.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

export function applySearchFilters(
  list: FileItem[],
  selectedType: SearchFileTypeFilter,
  selectedDate: SearchDateFilter,
): FileItem[] {
  return list.filter(
    (f) => matchesSearchFileType(f, selectedType) && matchesSearchDate(f, selectedDate),
  );
}
