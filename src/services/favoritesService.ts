/**
 * Favorites Service
 * Manages favorite/starred images using localStorage + IndexedDB
 * - localStorage stores metadata for quick access
 * - IndexedDB stores image blobs for permanent caching (beyond 24h expiry)
 */

import {
  cacheFavoriteImage,
  removeCachedFavorite,
  getCachedFavorite
} from '../utils/favoritesDB';

const FAVORITES_STORAGE_KEY = 'sogni_restoration_favorites';

export interface FavoriteImage {
  jobId: string;
  projectId: string;
  url: string;
  createdAt: number;
  modelName?: string;
  isCached?: boolean; // Whether the image blob is cached in IndexedDB
}

/**
 * Get all favorites from localStorage
 */
export function getFavorites(): FavoriteImage[] {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[favoritesService] Failed to read favorites:', error);
  }
  return [];
}

/**
 * Check if an image is favorited
 */
export function isFavorite(jobId: string): boolean {
  const favorites = getFavorites();
  return favorites.some(fav => fav.jobId === jobId);
}

/**
 * Add an image to favorites
 * Also caches the image blob in IndexedDB for permanent storage
 */
export async function addFavorite(image: FavoriteImage): Promise<boolean> {
  try {
    const favorites = getFavorites();

    // Check if already favorited
    if (favorites.some(fav => fav.jobId === image.jobId)) {
      return false;
    }

    // Add to localStorage first
    const favoriteWithCache: FavoriteImage = { ...image, isCached: false };
    favorites.push(favoriteWithCache);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));

    // Cache image blob in IndexedDB asynchronously
    // Don't await - let it happen in the background
    cacheFavoriteImage(
      image.jobId,
      image.projectId,
      image.url,
      image.createdAt,
      image.modelName
    ).then(() => {
      // Update the isCached flag
      const updatedFavorites = getFavorites();
      const index = updatedFavorites.findIndex(f => f.jobId === image.jobId);
      if (index !== -1) {
        updatedFavorites[index].isCached = true;
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
      }
    }).catch((error) => {
      console.error('[favoritesService] Failed to cache favorite image:', error);
      // Still keep in favorites even if caching fails
    });

    return true;
  } catch (error) {
    console.error('[favoritesService] Failed to add favorite:', error);
    return false;
  }
}

/**
 * Remove an image from favorites
 * Also removes cached blob from IndexedDB
 */
export async function removeFavorite(jobId: string): Promise<boolean> {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(fav => fav.jobId !== jobId);

    if (filtered.length === favorites.length) {
      return false; // Not found
    }

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(filtered));

    // Remove cached blob from IndexedDB
    // Don't await - let it happen in the background
    removeCachedFavorite(jobId).catch((error) => {
      console.error('[favoritesService] Failed to remove cached favorite:', error);
    });

    return true;
  } catch (error) {
    console.error('[favoritesService] Failed to remove favorite:', error);
    return false;
  }
}

/**
 * Normalize URL for comparison (remove query parameters, etc.)
 */
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Compare base URL without query parameters
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, just return as-is
    return url;
  }
}

/**
 * Toggle favorite status
 * Also checks by URL to match favorites created with placeholder jobIds
 */
export async function toggleFavorite(image: FavoriteImage): Promise<boolean> {
  const favorites = getFavorites();

  // Check if already favorited by jobId
  const existingByJobId = favorites.find(fav => fav.jobId === image.jobId);
  if (existingByJobId) {
    return await removeFavorite(image.jobId);
  }

  // Check if favorited by URL (for matching favorites from results page with placeholder jobIds)
  // Normalize URLs to handle signed URLs vs original URLs
  const normalizedImageUrl = normalizeUrl(image.url);
  const existingByUrl = favorites.find(fav => {
    const normalizedFavUrl = normalizeUrl(fav.url);
    return normalizedFavUrl === normalizedImageUrl || fav.url === image.url;
  });

  if (existingByUrl) {
    // Update the existing favorite with the new jobId and remove the old one
    await removeFavorite(existingByUrl.jobId);
    // Add with updated jobId
    return await addFavorite(image);
  }

  // Not favorited, add it
  return await addFavorite(image);
}

/**
 * Clear all favorites
 */
export function clearFavorites(): void {
  try {
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
  } catch (error) {
    console.error('[favoritesService] Failed to clear favorites:', error);
  }
}
