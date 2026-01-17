import { useRef, useEffect, useState, useMemo } from 'react';
import type { SogniClient } from '@sogni-ai/sogni-client';
import type { ArchiveJob } from '../../types/projectHistory';
import { useLazyLoad } from '../../hooks/useLazyLoad';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { useFavorites } from '../../hooks/useFavorites';
import type { FavoriteImage } from '../../services/favoritesService';
import './JobItem.css';

interface JobItemProps {
  job: ArchiveJob;
  aspect: number;
  sogniClient: SogniClient | null;
  onView: () => void;
  onHideJob?: (projectId: string, jobId: string) => void;
  modelName: string;
}

function JobItem({ job, aspect, sogniClient, onView, onHideJob, modelName }: JobItemProps) {
  // Lazy load media only when item is in viewport
  const { ref, isVisible } = useLazyLoad({
    rootMargin: '200px', // Increased margin to start loading earlier
    once: true
  });

  // Get media URL - enable immediately if job is completed (don't wait for viewport)
  const { url, loading, error, hidden } = useMediaUrl({
    projectId: job.projectId,
    jobId: job.id,
    type: job.type,
    sogniClient,
    enabled: job.status === 'completed' && !!sogniClient, // Load immediately, not waiting for viewport
    onHideJob
  });

  const { isFavorite, toggle, favorites } = useFavorites();
  const [isHovered, setIsHovered] = useState(false);
  
  // Normalize URL for comparison (remove query parameters, etc.)
  const normalizeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      // Compare base URL without query parameters
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, just return as-is
      return url;
    }
  };
  
  // Check if this job is favorited by jobId OR by URL (for matching favorites from results page)
  const isFavorited = useMemo(() => {
    const byJobId = isFavorite(job.id);
    if (byJobId) {
      return true;
    }
    // Also check by URL in case the favorite was created with a placeholder jobId
    // Normalize URLs to handle signed URLs vs original URLs
    if (url) {
      const normalizedUrl = normalizeUrl(url);
      const byUrl = favorites.some(fav => {
        const normalizedFavUrl = normalizeUrl(fav.url);
        const matches = normalizedFavUrl === normalizedUrl || fav.url === url;
        return matches;
      });
      return byUrl;
    }
    return false;
  }, [job.id, url, isFavorite, favorites]);


  // Don't render if job is hidden (media unavailable)
  if (hidden || job.hidden) {
    return null;
  }

  // Always render the item if job is completed, even if URL isn't loaded yet
  if (job.status !== 'completed') {
    return null;
  }

  return (
    <div
      ref={ref}
      className="job-item"
      onClick={url ? onView : undefined}
      role={url ? "button" : undefined}
      tabIndex={url ? 0 : undefined}
      onKeyDown={(e) => {
        if (url && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onView();
        }
      }}
      aria-label={url ? `View restored image ${job.id.slice(0, 8)}` : `Loading image ${job.id.slice(0, 8)}`}
      style={{ cursor: url ? 'pointer' : 'default' }}
    >
      {loading && (
        <div className="job-item-loading">
          <div className="job-item-spinner" />
          <span style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Loading...
          </span>
        </div>
      )}
      
      {error && !loading && (
        <div className="job-item-error">
          <span>⚠️</span>
          <span>Unable to load image</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Retry loading
              window.location.reload();
            }}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {url && !loading && !error && (
        <div
          className="relative w-full h-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <img
            className="job-item-media"
            src={url}
            alt={`Restored photo ${job.id.slice(0, 8)}`}
            loading="lazy"
            onError={(e) => {
              console.error('[JobItem] Image failed to load:', url, e);
              // Don't hide immediately - might be a temporary CORS/authentication issue
              // The error state will show instead
            }}
            onLoad={() => {
              console.log('[JobItem] Image loaded successfully:', job.id);
            }}
          />
          {/* Heart/Favorite Button */}
          {(isHovered || isFavorited) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Normalize URL for comparison
                const normalizedUrl = url ? normalizeUrl(url) : '';
                
                // If this job is favorited by URL (not jobId), find the existing favorite to update it
                let favoriteToToggle: FavoriteImage;
                if (!isFavorited && url) {
                  const existingFavorite = favorites.find(fav => {
                    const normalizedFavUrl = normalizeUrl(fav.url);
                    return normalizedFavUrl === normalizedUrl || fav.url === url;
                  });
                  if (existingFavorite) {
                    // Update the existing favorite with the real jobId
                    favoriteToToggle = {
                      ...existingFavorite,
                      jobId: job.id,
                      projectId: job.projectId
                    };
                  } else {
                    // Create new favorite
                    favoriteToToggle = {
                      jobId: job.id,
                      projectId: job.projectId,
                      url: url,
                      createdAt: Date.now()
                    };
                  }
                } else {
                  // Use existing favorite or create new one
                  const existingFavorite = favorites.find(fav => {
                    if (fav.jobId === job.id) return true;
                    if (url) {
                      const normalizedFavUrl = normalizeUrl(fav.url);
                      return normalizedFavUrl === normalizedUrl || fav.url === url;
                    }
                    return false;
                  });
                  favoriteToToggle = existingFavorite || {
                    jobId: job.id,
                    projectId: job.projectId,
                    url: url,
                    createdAt: Date.now()
                  };
                }
                toggle(favoriteToToggle);
              }}
              className="job-item-favorite"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(4px)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: isHovered || isFavorited ? 1 : 0.7,
                zIndex: 10
              }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorited ? (
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
          )}
        </div>
      )}
      
      {!loading && !error && !url && (
        <div className="job-item-placeholder">
          <div className="job-item-spinner" />
          <span style={{ marginTop: '8px', fontSize: '0.75rem' }}>Loading image...</span>
        </div>
      )}
    </div>
  );
}

export default JobItem;
