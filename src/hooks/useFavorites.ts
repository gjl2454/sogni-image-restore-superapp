import { useState, useEffect, useCallback } from 'react';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite as toggleFavoriteService,
  clearFavorites,
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
      // Dispatch custom event to notify other useFavorites instances in the same tab
      window.dispatchEvent(new CustomEvent('favorites-changed'));
    }
    return success;
  }, [refresh]);

  // Remove from favorites
  const remove = useCallback(async (jobId: string): Promise<boolean> => {
    const success = await removeFavorite(jobId);
    if (success) {
      refresh();
      // Dispatch custom event to notify other useFavorites instances in the same tab
      window.dispatchEvent(new CustomEvent('favorites-changed'));
    }
    return success;
  }, [refresh]);

  // Toggle favorite status
  const toggle = useCallback(async (image: FavoriteImage): Promise<boolean> => {
    const success = await toggleFavoriteService(image);
    refresh();
    // Dispatch custom event to notify other useFavorites instances in the same tab
    window.dispatchEvent(new CustomEvent('favorites-changed'));
    return success;
  }, [refresh]);

  // Clear all favorites
  const clear = useCallback(() => {
    clearFavorites();
    refresh();
    // Dispatch custom event to notify other useFavorites instances in the same tab
    window.dispatchEvent(new CustomEvent('favorites-changed'));
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

  // Listen for favorites changes from same tab (custom event)
  useEffect(() => {
    const handleFavoritesChanged = () => {
      refresh();
    };

    window.addEventListener('favorites-changed', handleFavoritesChanged);
    return () => window.removeEventListener('favorites-changed', handleFavoritesChanged);
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
