/**
 * Favorites IndexedDB Utilities
 *
 * Provides persistent storage for favorite images with cached blobs
 * so they remain available even after the 24-hour Sogni API expiry.
 */

export interface FavoriteCachedImage {
  jobId: string;
  projectId: string;
  blob: Blob;
  url: string; // Original URL for reference
  createdAt: number;
  cachedAt: number;
  modelName?: string;
  width?: number;
  height?: number;
}

const DB_NAME = 'sogni_favorites';
const DB_VERSION = 1;
const FAVORITES_STORE = 'favorites';

let dbInstance: IDBDatabase | null = null;

/**
 * Open the IndexedDB database, creating stores if needed
 */
function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[FavoritesDB] Failed to open database:', request.error);
      reject(new Error('Failed to open favorites database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle database closing unexpectedly
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create favorites store
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        const favoritesStore = db.createObjectStore(FAVORITES_STORE, { keyPath: 'jobId' });
        favoritesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        favoritesStore.createIndex('projectId', 'projectId', { unique: false });
      }
    };
  });
}

/**
 * Download image from URL and convert to blob
 * Uses fetch for better CORS handling, falls back to canvas if needed
 */
async function downloadImageAsBlob(url: string): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    // Try fetching directly first (works if CORS headers are present)
    console.log('[FavoritesDB] Attempting to fetch image:', url);
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('[FavoritesDB] Successfully fetched image blob, size:', blob.size);

    // Get image dimensions
    const dimensions = await getImageDimensions(blob);

    return {
      blob,
      width: dimensions.width,
      height: dimensions.height
    };
  } catch (fetchError) {
    console.warn('[FavoritesDB] Fetch failed, trying canvas approach:', fetchError);

    // Fallback: try loading via Image and canvas (for same-origin or CORS-enabled images)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          // Create a canvas to convert image to blob
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) {
              console.log('[FavoritesDB] Successfully created blob via canvas, size:', blob.size);
              resolve({
                blob,
                width: img.naturalWidth,
                height: img.naturalHeight
              });
            } else {
              reject(new Error('Failed to convert image to blob'));
            }
          }, 'image/png');
        } catch (canvasError) {
          reject(canvasError);
        }
      };

      img.onerror = (error) => {
        console.error('[FavoritesDB] Image load error:', error);
        reject(new Error('Failed to load image - CORS or network error'));
      };

      img.src = url;
    });
  }
}

/**
 * Get dimensions of an image blob
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image dimensions'));
    };

    img.src = url;
  });
}

/**
 * Get a favorite image from cache
 */
export async function getCachedFavorite(jobId: string): Promise<FavoriteCachedImage | null> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FAVORITES_STORE, 'readonly');
      const store = transaction.objectStore(FAVORITES_STORE);
      const request = store.get(jobId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('[FavoritesDB] Failed to get favorite:', request.error);
        reject(new Error('Failed to load favorite'));
      };
    });
  } catch (error) {
    console.error('[FavoritesDB] Error getting cached favorite:', error);
    return null;
  }
}

/**
 * Get all cached favorites
 */
export async function getAllCachedFavorites(): Promise<FavoriteCachedImage[]> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FAVORITES_STORE, 'readonly');
      const store = transaction.objectStore(FAVORITES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const favorites = (request.result as FavoriteCachedImage[]).sort(
          (a, b) => b.cachedAt - a.cachedAt
        );
        resolve(favorites);
      };

      request.onerror = () => {
        console.error('[FavoritesDB] Failed to get all favorites:', request.error);
        reject(new Error('Failed to load favorites'));
      };
    });
  } catch (error) {
    console.error('[FavoritesDB] Error getting all cached favorites:', error);
    return [];
  }
}

/**
 * Cache a favorite image by downloading and storing its blob
 */
export async function cacheFavoriteImage(
  jobId: string,
  projectId: string,
  url: string,
  createdAt: number,
  modelName?: string
): Promise<FavoriteCachedImage> {
  const db = await openDB();

  // Download the image
  const { blob, width, height } = await downloadImageAsBlob(url);

  const favorite: FavoriteCachedImage = {
    jobId,
    projectId,
    blob,
    url,
    createdAt,
    cachedAt: Date.now(),
    modelName,
    width,
    height
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FAVORITES_STORE, 'readwrite');
    const store = transaction.objectStore(FAVORITES_STORE);
    const request = store.put(favorite);

    request.onsuccess = () => {
      console.log('[FavoritesDB] Successfully cached favorite:', jobId);
      resolve(favorite);
    };

    request.onerror = () => {
      console.error('[FavoritesDB] Failed to cache favorite:', request.error);
      reject(new Error('Failed to cache favorite image'));
    };
  });
}

/**
 * Remove a favorite from cache
 */
export async function removeCachedFavorite(jobId: string): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FAVORITES_STORE, 'readwrite');
      const store = transaction.objectStore(FAVORITES_STORE);
      const request = store.delete(jobId);

      request.onsuccess = () => {
        console.log('[FavoritesDB] Successfully removed favorite:', jobId);
        resolve();
      };

      request.onerror = () => {
        console.error('[FavoritesDB] Failed to remove favorite:', request.error);
        reject(new Error('Failed to remove favorite'));
      };
    });
  } catch (error) {
    console.error('[FavoritesDB] Error removing cached favorite:', error);
  }
}

/**
 * Create a blob URL for a cached favorite (caller is responsible for revoking)
 */
export function createFavoriteBlobUrl(favorite: FavoriteCachedImage): string {
  return URL.createObjectURL(favorite.blob);
}

/**
 * Get storage usage statistics
 */
export async function getFavoritesStorageStats(): Promise<{
  count: number;
  totalSizeBytes: number;
}> {
  try {
    const favorites = await getAllCachedFavorites();
    const totalSizeBytes = favorites.reduce((sum, fav) => sum + fav.blob.size, 0);

    return {
      count: favorites.length,
      totalSizeBytes
    };
  } catch (error) {
    console.error('[FavoritesDB] Error getting storage stats:', error);
    return { count: 0, totalSizeBytes: 0 };
  }
}

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
