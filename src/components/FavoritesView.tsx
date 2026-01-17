import React, { useState, useCallback } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { useMediaUrl } from '../hooks/useMediaUrl';
import type { SogniClient } from '@sogni-ai/sogni-client';
import type { FavoriteImage } from '../services/favoritesService';
import './FavoritesView.css';

interface FavoritesViewProps {
  sogniClient: SogniClient | null;
  onViewImage?: (favorite: FavoriteImage) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ sogniClient, onViewImage }) => {
  const { favorites, isFavorite, toggle, refresh } = useFavorites();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleToggleFavorite = useCallback((favorite: FavoriteImage, e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(favorite);
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
  sogniClient,
  isHovered,
  onHoverChange,
  onToggleFavorite,
  onView,
  isFavorite
}: FavoriteItemProps) {
  // Try to get fresh URL if needed (for S3 signed URLs that may have expired)
  const { url, loading } = useMediaUrl({
    projectId: favorite.projectId,
    jobId: favorite.jobId,
    type: 'image',
    sogniClient,
    enabled: !!sogniClient && !!favorite.projectId && !!favorite.jobId
  });

  // Use cached URL from favorite if available, otherwise use fetched URL
  const displayUrl = url || favorite.url;

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
      ) : (
        <div className="favorite-item-error">
          <span>⚠️</span>
          <span>Unable to load image</span>
        </div>
      )}
    </div>
  );
}

export default FavoritesView;
