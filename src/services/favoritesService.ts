/**
 * Favorites Service
 * Manages favorite/starred images using localStorage
 */

const FAVORITES_STORAGE_KEY = 'sogni_restoration_favorites';

export interface FavoriteImage {
  jobId: string;
  projectId: string;
  url: string;
  createdAt: number;
  modelName?: string;
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
 */
export function addFavorite(image: FavoriteImage): boolean {
  try {
    const favorites = getFavorites();
    
    // Check if already favorited
    if (favorites.some(fav => fav.jobId === image.jobId)) {
      return false;
    }
    
    favorites.push(image);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    return true;
  } catch (error) {
    console.error('[favoritesService] Failed to add favorite:', error);
    return false;
  }
}

/**
 * Remove an image from favorites
 */
export function removeFavorite(jobId: string): boolean {
  try {
    const favorites = getFavorites();
    const filtered = favorites.filter(fav => fav.jobId !== jobId);
    
    if (filtered.length === favorites.length) {
      return false; // Not found
    }
    
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(filtered));
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
export function toggleFavorite(image: FavoriteImage): boolean {
  const favorites = getFavorites();
  
  // Check if already favorited by jobId
  const existingByJobId = favorites.find(fav => fav.jobId === image.jobId);
  if (existingByJobId) {
    return removeFavorite(image.jobId);
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
    removeFavorite(existingByUrl.jobId);
    // Add with updated jobId
    return addFavorite(image);
  }
  
  // Not favorited, add it
  return addFavorite(image);
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
