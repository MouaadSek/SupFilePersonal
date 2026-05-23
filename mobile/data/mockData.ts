import {
  FileItem,
  User,
  Activity,
  StorageStats,
  ShareLink,
  IncomingShareEntry,
} from '@/types';

// Mock current user
export const mockUser: User = {
  id: '1',
  email: 'jean.dupont@email.com',
  name: 'Jean Dupont',
  avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=jean',
  createdAt: new Date('2024-01-15'),
  storageUsed: 15.7 * 1024 * 1024 * 1024, // 15.7 GB
  storageLimit: 30 * 1024 * 1024 * 1024, // 30 GB
};

// Mock files and folders
export const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Documents',
    type: 'folder',
    createdAt: new Date('2024-01-20'),
    modifiedAt: new Date('2024-03-15'),
    parentId: null,
    path: '/Documents',
  },
  {
    id: '2',
    name: 'Photos',
    type: 'folder',
    createdAt: new Date('2024-02-10'),
    modifiedAt: new Date('2024-03-18'),
    parentId: null,
    path: '/Photos',
  },
  {
    id: '3',
    name: 'Videos',
    type: 'folder',
    createdAt: new Date('2024-02-15'),
    modifiedAt: new Date('2024-03-10'),
    parentId: null,
    path: '/Videos',
  },
  {
    id: '4',
    name: 'Musique',
    type: 'folder',
    createdAt: new Date('2024-02-20'),
    modifiedAt: new Date('2024-03-05'),
    parentId: null,
    path: '/Musique',
  },
  {
    id: '5',
    name: 'Rapport_2024.pdf',
    type: 'file',
    mimeType: 'application/pdf',
    size: 2.5 * 1024 * 1024,
    createdAt: new Date('2024-03-01'),
    modifiedAt: new Date('2024-03-15'),
    parentId: '1',
    path: '/Documents/Rapport_2024.pdf',
    downloadUrl: 'https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf',
  },
  {
    id: '6',
    name: 'Budget_Projet.xlsx',
    type: 'file',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1.2 * 1024 * 1024,
    createdAt: new Date('2024-03-05'),
    modifiedAt: new Date('2024-03-18'),
    parentId: '1',
    path: '/Documents/Budget_Projet.xlsx',
    downloadUrl: 'https://filesamples.com/samples/document/xlsx/sample1.xlsx',
  },
  {
    id: '7',
    name: 'Notes_Reunion.txt',
    type: 'file',
    mimeType: 'text/plain',
    size: 15 * 1024,
    createdAt: new Date('2024-03-10'),
    modifiedAt: new Date('2024-03-10'),
    parentId: '1',
    path: '/Documents/Notes_Reunion.txt',
    downloadUrl: 'https://filesamples.com/samples/document/txt/sample1.txt',
  },
  {
    id: '8',
    name: 'Vacances_2024.jpg',
    type: 'file',
    mimeType: 'image/jpeg',
    size: 4.8 * 1024 * 1024,
    createdAt: new Date('2024-03-12'),
    modifiedAt: new Date('2024-03-12'),
    parentId: '2',
    path: '/Photos/Vacances_2024.jpg',
    thumbnail: 'https://picsum.photos/seed/vacation/400/300',
  },
  {
    id: '9',
    name: 'Portrait.png',
    type: 'file',
    mimeType: 'image/png',
    size: 2.1 * 1024 * 1024,
    createdAt: new Date('2024-03-14'),
    modifiedAt: new Date('2024-03-14'),
    parentId: '2',
    path: '/Photos/Portrait.png',
    thumbnail: 'https://picsum.photos/seed/portrait/400/300',
  },
  {
    id: '10',
    name: 'Presentation.mp4',
    type: 'file',
    mimeType: 'video/mp4',
    size: 156 * 1024 * 1024,
    createdAt: new Date('2024-03-08'),
    modifiedAt: new Date('2024-03-08'),
    parentId: '3',
    path: '/Videos/Presentation.mp4',
    downloadUrl:
      'https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4',
  },
  {
    id: '11',
    name: 'Podcast_Episode_1.mp3',
    type: 'file',
    mimeType: 'audio/mpeg',
    size: 45 * 1024 * 1024,
    createdAt: new Date('2024-03-06'),
    modifiedAt: new Date('2024-03-06'),
    parentId: '4',
    path: '/Musique/Podcast_Episode_1.mp3',
    downloadUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '12',
    name: 'Projet_Final.docx',
    type: 'file',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 3.2 * 1024 * 1024,
    createdAt: new Date('2024-03-16'),
    modifiedAt: new Date('2024-03-18'),
    parentId: null,
    path: '/Projet_Final.docx',
    isShared: true,
    downloadUrl: 'https://filesamples.com/samples/document/docx/sample1.docx',
  },
  {
    id: '13',
    name: 'README.md',
    type: 'file',
    mimeType: 'text/markdown',
    size: 8 * 1024,
    createdAt: new Date('2024-03-17'),
    modifiedAt: new Date('2024-03-17'),
    parentId: null,
    path: '/README.md',
    downloadUrl: 'https://raw.githubusercontent.com/octocat/Hello-World/master/README',
  },
];

// Mock recent activities
export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'upload',
    fileId: '12',
    fileName: 'Projet_Final.docx',
    timestamp: new Date('2024-03-18T14:30:00'),
  },
  {
    id: '2',
    type: 'share',
    fileId: '12',
    fileName: 'Projet_Final.docx',
    timestamp: new Date('2024-03-18T14:35:00'),
  },
  {
    id: '3',
    type: 'upload',
    fileId: '9',
    fileName: 'Portrait.png',
    timestamp: new Date('2024-03-14T10:20:00'),
  },
  {
    id: '4',
    type: 'download',
    fileId: '5',
    fileName: 'Rapport_2024.pdf',
    timestamp: new Date('2024-03-13T16:45:00'),
  },
  {
    id: '5',
    type: 'rename',
    fileId: '8',
    fileName: 'Vacances_2024.jpg',
    timestamp: new Date('2024-03-12T09:15:00'),
  },
];

// Mock storage stats
export const mockStorageStats: StorageStats = {
  total: 30 * 1024 * 1024 * 1024, // 30 GB
  used: 15.7 * 1024 * 1024 * 1024, // 15.7 GB
  breakdown: [
    { type: 'Videos', size: 8.5 * 1024 * 1024 * 1024, color: '#ef4444' },
    { type: 'Photos', size: 4.2 * 1024 * 1024 * 1024, color: '#10b981' },
    { type: 'Documents', size: 2.1 * 1024 * 1024 * 1024, color: '#30a8fe' },
    { type: 'Musique', size: 0.9 * 1024 * 1024 * 1024, color: '#f59e0b' },
  ],
};

// Mock shared links (liens publics fichier ou dossier)
export const mockSharedLinks: ShareLink[] = [
  {
    id: '1',
    targetId: '12',
    targetType: 'file',
    token: 'abc123',
    url: 'https://supfile.app/s/abc123',
    expiresAt: new Date('2026-12-18'),
    createdAt: new Date('2024-03-18'),
    downloads: 5,
  },
  {
    id: '2',
    targetId: '5',
    targetType: 'file',
    token: 'def456',
    url: 'https://supfile.app/s/def456',
    password: 'secure123',
    createdAt: new Date('2024-03-15'),
    downloads: 12,
  },
  {
    id: '3',
    targetId: '1',
    targetType: 'folder',
    token: 'fold789',
    url: 'https://supfile.app/s/fold789',
    createdAt: new Date('2024-03-10'),
    downloads: 2,
  },
];

export const mockIncomingShares: IncomingShareEntry[] = [
  {
    id: 'in-1',
    itemType: 'folder',
    name: 'Campagne Q1',
    ownerLabel: 'Marie Dupont',
    sharedAt: new Date('2026-05-01'),
  },
  {
    id: 'in-2',
    itemType: 'file',
    name: 'Contrat-cadre.pdf',
    ownerLabel: 'Agence Nova',
    sharedAt: new Date('2026-05-08'),
  },
];

// Helper functions
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
      return minutes <= 1 ? 'A l\'instant' : `Il y a ${minutes} min`;
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
