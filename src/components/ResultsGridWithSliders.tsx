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

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Header - more compact */}
      <div className="text-center flex-shrink-0">
        <p className="font-bold" style={{
          background: 'var(--sogni-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '0.9375rem',
          marginBottom: '0.25rem',
          letterSpacing: '-0.01em'
        }}>
          ✨ {restorationJobs.some(j => j.generating) ? 'Restoring Your Photos' : 'Review Your Results'}
        </p>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.75rem',
          fontWeight: 500
        }}>
          {restorationJobs.some(j => j.generating) 
            ? 'Each restoration appears as it completes'
            : 'Compare before and after for each restoration'
          }
        </p>
      </div>

      {/* Grid of Results/Placeholders - compact layout to fit all without scrolling */}
      <div className={`grid ${getGridCols()} gap-2 flex-shrink-0 px-1`}>
        {itemsToDisplay.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col gap-1 fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both',
              opacity: 0
            }}
          >
            {/* Before/After Slider Container or Loading Placeholder - smaller and squarer */}
            <div
              className="relative rounded-md overflow-hidden transition-all duration-300"
              onMouseEnter={() => !item.generating ? setHoveredIndex(index) : null}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                aspectRatio: '1 / 1',
                background: item.generating ? 'linear-gradient(135deg, rgba(180, 205, 237, 0.1), rgba(194, 148, 255, 0.1))' : 'var(--color-bg-elevated)',
                boxShadow: hoveredIndex === index && !item.generating
                  ? '0 8px 24px rgba(180, 205, 237, 0.4), 0 0 0 2px rgba(180, 205, 237, 0.3)'
                  : '0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px var(--color-border-light)',
                transform: hoveredIndex === index && !item.generating ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid var(--color-border-light)'
              }}
            >
              {item.generating ? (
                /* PHOTOBOOTH PATTERN: Loading placeholder with progress and ETA - more compact */
                <div className="w-full h-full flex flex-col items-center justify-center p-3">
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
                <div className="relative w-full h-full">
                  {originalImage ? (
                    <div className="w-full h-full cursor-pointer">
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
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => onSelect(item.resultUrl!, item.index)}
                    />
                  )}
                  {/* Heart/Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Use item.id (unique per restoration) instead of index-based ID
                      // This ensures each restoration has unique job IDs
                      const jobId = item.id;
                      const favoriteImage: FavoriteImage = {
                        jobId,
                        projectId: projectId || `temp-${Date.now()}`,
                        url: item.resultUrl!,
                        createdAt: Date.now(),
                        modelName: modelName
                      };
                      toggle(favoriteImage);
                    }}
                    className="absolute top-2 right-2 z-10"
                    style={{
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
                    <span style={{ fontSize: '18px' }}>
                      {isFavorite(item.id) ? '❤️' : '🤍'}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Result Number Badge and Action Button - more compact */}
            <div className="flex items-center justify-between flex-shrink-0">
              <span
                className="px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: item.generating ? 'rgba(180, 205, 237, 0.1)' : 'var(--sogni-gradient-subtle)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.625rem'
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
                    fontWeight: 500
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

