import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  apiGetFavorites,
  apiToggleFavoriteFile,
  apiToggleFavoriteFolder,
} from '@/services/api/favorites';
import { useAuth } from './AuthContext';
import type { FileItem } from '@/types';

interface FavoritesContextType {
  favoritedIds: Set<string>;
  isFavorited: (id: string) => boolean;
  toggleFavorite: (item: FileItem) => Promise<void>;
  loadFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    try {
      const data = await apiGetFavorites();
      const ids = [...(data.file_ids ?? []), ...(data.folder_ids ?? [])];
      setFavoritedIds(new Set(ids));
    } catch {
      // silently ignore — favorites are non-critical
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadFavorites();
    } else {
      setFavoritedIds(new Set());
    }
  }, [isAuthenticated, loadFavorites]);

  const isFavorited = useCallback(
    (id: string) => favoritedIds.has(id),
    [favoritedIds],
  );

  const toggleFavorite = useCallback(async (item: FileItem) => {
    const wasStarred = favoritedIds.has(item.id);
    // Optimistic update
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    try {
      if (item.type === 'file') {
        await apiToggleFavoriteFile(item.id);
      } else {
        await apiToggleFavoriteFolder(item.id);
      }
    } catch {
      // Revert optimistic update on failure
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (wasStarred) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      Alert.alert('Favoris', 'Impossible de mettre à jour les favoris.');
    }
  }, [favoritedIds]);

  return (
    <FavoritesContext.Provider value={{ favoritedIds, isFavorited, toggleFavorite, loadFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
