import React, { useState, useCallback, useEffect } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { getCachedFavorite, createFavoriteBlobUrl, cacheFavoriteImage } from '../utils/favoritesDB';
import type { SogniClient } from '@sogni-ai/sogni-client';
import type { FavoriteImage } from '../services/favoritesService';
import './FavoritesView.css';

interface FavoritesViewProps {
  sogniClient: SogniClient | null;
  onViewImage?: (favorite: FavoriteImage) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ sogniClient, onViewImage }) => {
  const { favorites, isFavorite, toggle } = useFavorites();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleToggleFavorite = useCallback(async (favorite: FavoriteImage, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggle(favorite);
  }, [toggle]);

  const handleView = useCallback((favorite: FavoriteImage) => {
    if (onViewImage) {
      onViewImage(favorite);
    }
  }, [onViewImage]);

  if (favorites.length === 0) {
    return (
      <div className="favorites-empty">
        <div className="favorites-empty-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <p className="favorites-empty-title">No favorites yet</p>
        <p className="favorites-empty-subtitle">
          Heart images from your results or recent projects to save them here
        </p>
      </div>
    );
  }

  return (
    <div className="favorites-grid">
      {favorites.map((favorite) => (
        <FavoriteItem
          key={favorite.jobId}
          favorite={favorite}
          sogniClient={sogniClient}
          isHovered={hoveredId === favorite.jobId}
          onHoverChange={setHoveredId}
          onToggleFavorite={handleToggleFavorite}
          onView={handleView}
          isFavorite={isFavorite(favorite.jobId)}
        />
      ))}
    </div>
  );
};

interface FavoriteItemProps {
  favorite: FavoriteImage;
  sogniClient: SogniClient | null;
  isHovered: boolean;
  onHoverChange: (id: string | null) => void;
  onToggleFavorite: (favorite: FavoriteImage, e: React.MouseEvent) => void;
  onView: (favorite: FavoriteImage) => void;
  isFavorite: boolean;
}

function FavoriteItem({
  favorite,
  isHovered,
  onHoverChange,
  onToggleFavorite,
  onView,
  isFavorite
}: FavoriteItemProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Load cached image from IndexedDB on mount
  useEffect(() => {
    let mounted = true;

    async function loadCachedImage() {
      try {
        const cached = await getCachedFavorite(favorite.jobId);
        if (cached && mounted) {
          const url = createFavoriteBlobUrl(cached);
          setBlobUrl(url);
          setDisplayUrl(url);
          setLoading(false);
          console.log('[FavoriteItem] Loaded cached image for:', favorite.jobId);
        } else {
          // No cached image, fall back to original URL
          console.log('[FavoriteItem] No cached image found for:', favorite.jobId, 'using original URL');
          setDisplayUrl(favorite.url);
          setLoading(false);
        }
      } catch (error) {
        console.error('[FavoriteItem] Failed to load cached image:', error);
        // Fall back to original URL
        if (mounted) {
          setDisplayUrl(favorite.url);
          setLoading(false);
        }
      }
    }

    loadCachedImage();

    return () => {
      mounted = false;
      // Clean up blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [favorite.jobId, favorite.url]);

  // Handle image load error (expired URL)
  const handleImageError = useCallback(async () => {
    console.error('[FavoriteItem] Image failed to load for:', favorite.jobId);
    setImageError(true);
    // Remove this favorite since it can't be displayed
    await onToggleFavorite(favorite, { stopPropagation: () => {} } as React.MouseEvent);
  }, [favorite, onToggleFavorite]);

  // Handle successful image load - if using original URL and not cached, try to cache it
  const handleImageLoad = useCallback(() => {
    // If we're using the original URL (not a blob URL), try to cache it
    if (displayUrl === favorite.url && !blobUrl) {
      console.log('[FavoriteItem] Image loaded from original URL, attempting to cache:', favorite.jobId);
      cacheFavoriteImage(
        favorite.jobId,
        favorite.projectId,
        favorite.url,
        favorite.createdAt,
        favorite.modelName
      ).then(() => {
        console.log('[FavoriteItem] Successfully cached image:', favorite.jobId);
      }).catch((error) => {
        console.warn('[FavoriteItem] Failed to cache image on load:', error);
      });
    }
  }, [displayUrl, favorite, blobUrl]);

  // Clean up blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Don't render if image failed to load or has no URL
  if (imageError || (!loading && !displayUrl)) {
    return null;
  }

  return (
    <div
      className="favorite-item"
      onMouseEnter={() => onHoverChange(favorite.jobId)}
      onMouseLeave={() => onHoverChange(null)}
      onClick={() => onView(favorite)}
    >
      {loading && !displayUrl ? (
        <div className="favorite-item-loading">
          <div className="favorite-item-spinner" />
        </div>
      ) : displayUrl ? (
        <>
          <img
            src={displayUrl}
            alt={`Favorite ${favorite.jobId.slice(0, 8)}`}
            className="favorite-item-image"
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <button
            onClick={(e) => onToggleFavorite(favorite, e)}
            className="favorite-item-heart"
            style={{
              opacity: isHovered ? 1 : 0.7
            }}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#7BA3D0' }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'rgba(255, 255, 255, 0.8)' }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </button>
        </>
      ) : null}
    </div>
  );
}

export default FavoritesView;
