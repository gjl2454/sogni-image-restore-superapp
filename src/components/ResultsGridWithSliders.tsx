import React, { useState } from 'react';
import { BeforeAfterCompare } from './BeforeAfterCompare';
import { useFavorites } from '../hooks/useFavorites';
import type { FavoriteImage } from '../services/favoritesService';

// Match RestorationJob from useRestoration
interface RestorationJob {
  id: string;
  index: number;
  generating: boolean;
  progress: number;
  resultUrl: string | null;
  error: string | null;
  etaSeconds?: number;
}

interface ResultsGridWithSlidersProps {
  results: string[];
  restorationJobs?: RestorationJob[];
  originalImage?: string;
  onSelect: (url: string, jobIndex?: number) => void;
  onDownload?: (url: string) => void;
  projectId?: string; // Optional project ID for favorites
  modelName?: string; // Optional model name for favorites
}

export const ResultsGridWithSliders: React.FC<ResultsGridWithSlidersProps> = ({
  results,
  restorationJobs = [],
  originalImage,
  onSelect,
  onDownload,
  projectId,
  modelName
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isFavorite, toggle } = useFavorites();

  // PHOTOBOOTH PATTERN: Use jobs if available (shows placeholders), otherwise fall back to results
  const itemsToDisplay = restorationJobs.length > 0 ? restorationJobs : results.map((url, idx) => ({
    id: `result-${idx}`,
    index: idx,
    generating: false,
    progress: 1,
    resultUrl: url,
    error: null
  }));

  if (itemsToDisplay.length === 0) return null;

  // Determine grid columns based on number of items - more columns = smaller images
  const getGridCols = () => {
    if (itemsToDisplay.length === 2) return 'grid-cols-2';
    if (itemsToDisplay.length === 4) return 'grid-cols-2 md:grid-cols-4';
    if (itemsToDisplay.length === 6) return 'grid-cols-3 md:grid-cols-6';
    return 'grid-cols-2 md:grid-cols-4';
  };

  // Calculate grid rows based on number of items
  const getGridRows = () => {
    if (itemsToDisplay.length === 2) return 1;
    if (itemsToDisplay.length === 4) return 1; // 4 columns on desktop
    if (itemsToDisplay.length === 6) return 1; // 6 columns on desktop
    return 1;
  };

  return (
    <div className="w-full h-full flex flex-col gap-1.5" style={{ overflow: 'hidden' }}>
      {/* Header - ultra compact */}
      <div className="text-center flex-shrink-0">
        <p className="font-bold" style={{
          background: 'var(--sogni-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '0.875rem',
          marginBottom: '0.125rem',
          letterSpacing: '-0.01em'
        }}>
          ✨ {restorationJobs.some(j => j.generating) ? 'Restoring Your Photos' : 'Review Your Results'}
        </p>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.6875rem',
          fontWeight: 500
        }}>
          {restorationJobs.some(j => j.generating)
            ? 'Each restoration appears as it completes'
            : 'Drag slider to compare • Tap ♡ to save forever'
          }
        </p>
      </div>

      {/* Expiry Warning Banner */}
      {!restorationJobs.some(j => j.generating) && itemsToDisplay.some(item => item.resultUrl) && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 152, 0, 0.1)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: '6px',
            fontSize: '0.7rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0
          }}
        >
          <span>⚠️</span>
          <div>
            <strong style={{ color: 'var(--color-text-primary)' }}>These images expire in 24 hours.</strong>
            {' '}Favorite (♡) to save permanently or download to your device.
          </div>
        </div>
      )}

      {/* Grid of Results/Placeholders - ultra compact to fit without scrolling */}
      <div
        className={`grid ${getGridCols()} gap-1.5`}
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          width: '100%',
          maxHeight: '100%',
          alignContent: 'center',
          justifyContent: 'center',
          // For 2 items, 1 row taking full height. For 4 items, 2 rows on mobile
          gridAutoRows: itemsToDisplay.length === 2
            ? 'minmax(0, 1fr)'
            : itemsToDisplay.length === 4
              ? 'minmax(0, calc(50% - 3px))'
              : 'minmax(0, 1fr)'
        }}
      >
        {itemsToDisplay.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col gap-0.5 fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both',
              opacity: 0,
              minHeight: 0,
              minWidth: 0,
              width: '100%',
              height: '100%',
              maxHeight: '100%'
            }}
          >
            {/* Before/After Slider Container or Loading Placeholder */}
            <div
              className="relative rounded-md transition-all duration-300"
              onMouseEnter={() => !item.generating ? setHoveredIndex(index) : null}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                aspectRatio: '1 / 1',
                position: 'relative',
                background: item.generating ? 'linear-gradient(135deg, rgba(180, 205, 237, 0.1), rgba(194, 148, 255, 0.1))' : 'var(--color-bg-elevated)',
                boxShadow: hoveredIndex === index && !item.generating
                  ? '0 6px 20px rgba(180, 205, 237, 0.35), 0 0 0 2px rgba(180, 205, 237, 0.3)'
                  : '0 1px 4px rgba(0, 0, 0, 0.05), 0 0 0 1px var(--color-border-light)',
                transform: hoveredIndex === index && !item.generating ? 'translateY(-1px) scale(1.015)' : 'translateY(0) scale(1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid var(--color-border-light)',
                objectFit: 'contain'
              }}
            >
              {item.generating ? (
                /* PHOTOBOOTH PATTERN: Loading placeholder with progress and ETA - ultra compact */
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                  <div className="text-2xl mb-2 animate-pulse">✨</div>
                  <div className="w-full max-w-[85%]">
                    <div className="w-full rounded-full h-1.5 overflow-hidden mb-1" style={{
                      background: 'rgba(180, 205, 237, 0.2)'
                    }}>
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(item.progress * 100)}%`,
                          background: 'var(--sogni-gradient)',
                          boxShadow: '0 0 8px rgba(180, 205, 237, 0.5)'
                        }}
                      />
                    </div>
                    <p className="text-center font-semibold" style={{ color: 'var(--color-text-primary)', fontSize: '0.6875rem' }}>
                      {item.etaSeconds !== undefined && item.etaSeconds > 0 
                        ? (() => {
                            if (item.etaSeconds < 60) return `${Math.ceil(item.etaSeconds)}s`;
                            const minutes = Math.floor(item.etaSeconds / 60);
                            const remainingSeconds = Math.ceil(item.etaSeconds % 60);
                            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
                          })()
                        : `${Math.round(item.progress * 100)}%`
                      }
                    </p>
                  </div>
                </div>
              ) : item.resultUrl ? (
                /* Show completed result */
                <div className="absolute inset-0 flex items-center justify-center" style={{ padding: '8px' }}>
                  {originalImage ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BeforeAfterCompare
                        beforeImage={originalImage}
                        afterImage={item.resultUrl}
                        onClick={() => onSelect(item.resultUrl!, item.index)}
                      />
                    </div>
                  ) : (
                    <img
                      src={item.resultUrl}
                      alt={`Result ${index + 1}`}
                      className="cursor-pointer"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block'
                      }}
                      onClick={() => onSelect(item.resultUrl!, item.index)}
                    />
                  )}
                  {/* Heart/Favorite Button - smaller */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      // Use item.id (unique per restoration) instead of index-based ID
                      // This ensures each restoration has unique job IDs
                      const jobId = item.id;
                      const favoriteImage: FavoriteImage = {
                        jobId,
                        projectId: projectId || `temp-${Date.now()}`,
                        url: item.resultUrl!,
                        createdAt: Date.now(),
                        modelName
                      };
                      await toggle(favoriteImage);
                    }}
                    className="absolute top-1.5 right-1.5 z-10"
                    style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(4px)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: hoveredIndex === index ? 1 : 0.7
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite(item.id) ? (
                      <svg
                        width="16"
                        height="16"
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
                        width="16"
                        height="16"
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
                </div>
              ) : null}
            </div>

            {/* Result Number Badge and Action Button - ultra compact */}
            <div className="flex items-center justify-between flex-shrink-0">
              <span
                className="px-1.5 py-0.5 rounded-full font-semibold"
                style={{
                  background: item.generating ? 'rgba(180, 205, 237, 0.1)' : 'var(--sogni-gradient-subtle)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.625rem',
                  lineHeight: '1'
                }}
              >
                {item.generating ? '...' : `#${index + 1}`}
              </span>
              {onDownload && item.resultUrl && !item.generating && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(item.resultUrl!);
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.625rem',
                    fontWeight: 500,
                    lineHeight: '1'
                  }}
                >
                  ↓
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

