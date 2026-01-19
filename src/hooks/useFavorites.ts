import { useState, useEffect, useCallback } from 'react';
import {
  getFavorites,
  isFavorite as checkIsFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite as toggleFavoriteService,
  type FavoriteImage
} from '../services/favoritesService';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteImage[]>(getFavorites);

  // Refresh favorites from localStorage
  const refresh = useCallback(() => {
    setFavorites(getFavorites());
  }, []);

  // Check if an image is favorited
  // Use the favorites state to make it reactive to changes
  const isFavorite = useCallback((jobId: string): boolean => {
    return favorites.some(fav => fav.jobId === jobId);
  }, [favorites]);

  // Add to favorites
  const add = useCallback(async (image: FavoriteImage): Promise<boolean> => {
    const success = await addFavorite(image);
    if (success) {
      refresh();
    }
    return success;
  }, [refresh]);

  // Remove from favorites
  const remove = useCallback(async (jobId: string): Promise<boolean> => {
    const success = await removeFavorite(jobId);
    if (success) {
      refresh();
    }
    return success;
  }, [refresh]);

  // Toggle favorite status
  const toggle = useCallback(async (image: FavoriteImage): Promise<boolean> => {
    const success = await toggleFavoriteService(image);
    refresh();
    return success;
  }, [refresh]);

  // Clear all favorites
  const clear = useCallback(() => {
    clearFavorites();
    refresh();
  }, [refresh]);

  // Listen for storage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sogni_restoration_favorites') {
        refresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refresh]);

  return {
    favorites,
    isFavorite,
    add,
    remove,
    toggle,
    clear,
    refresh
  };
}
