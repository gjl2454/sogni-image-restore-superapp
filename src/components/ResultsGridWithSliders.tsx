import React, { useState } from 'react';
import { BeforeAfterCompare } from './BeforeAfterCompare';

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
  onSelect: (url: string) => void;
  onDownload?: (url: string) => void;
}

export const ResultsGridWithSliders: React.FC<ResultsGridWithSlidersProps> = ({
  results,
  restorationJobs = [],
  originalImage,
  onSelect,
  onDownload
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  // Determine grid columns based on number of items
  const getGridCols = () => {
    if (itemsToDisplay.length === 2) return 'grid-cols-1 md:grid-cols-2';
    if (itemsToDisplay.length === 4) return 'grid-cols-2';
    if (itemsToDisplay.length === 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2';
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div className="text-center flex-shrink-0">
        <p className="font-bold" style={{
          background: 'var(--sogni-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '1.0625rem',
          marginBottom: '0.375rem',
          letterSpacing: '-0.01em'
        }}>
          ✨ {restorationJobs.some(j => j.generating) ? 'Restoring Your Photos' : 'Review Your Results'}
        </p>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.8125rem',
          fontWeight: 500
        }}>
          {restorationJobs.some(j => j.generating) 
            ? 'Each restoration appears as it completes'
            : 'Compare before and after for each restoration'
          }
        </p>
      </div>

      {/* Grid of Results/Placeholders (PHOTOBOOTH PATTERN) */}
      <div className={`grid ${getGridCols()} gap-4 flex-1 min-h-0 pb-4 px-2`}>
        {itemsToDisplay.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both',
              opacity: 0
            }}
          >
            {/* Before/After Slider Container or Loading Placeholder */}
            <div
              className="relative rounded-lg overflow-hidden transition-all duration-300"
              onMouseEnter={() => !item.generating ? setHoveredIndex(index) : null}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                aspectRatio: '3 / 4',
                background: item.generating ? 'linear-gradient(135deg, rgba(180, 205, 237, 0.1), rgba(194, 148, 255, 0.1))' : 'var(--color-bg-elevated)',
                boxShadow: hoveredIndex === index && !item.generating
                  ? '0 16px 56px rgba(180, 205, 237, 0.5), 0 0 0 2px rgba(180, 205, 237, 0.3), 0 0 60px rgba(180, 205, 237, 0.6), 0 0 100px rgba(180, 205, 237, 0.4)'
                  : '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--color-border-light)',
                transform: hoveredIndex === index && !item.generating ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid var(--color-border-light)'
              }}
            >
              {item.generating ? (
                /* PHOTOBOOTH PATTERN: Loading placeholder with progress and ETA */
                <div className="w-full h-full flex flex-col items-center justify-center p-6">
                  <div className="text-4xl mb-4 animate-pulse">✨</div>
                  <div className="w-full max-w-[80%]">
                    <div className="w-full rounded-full h-2 overflow-hidden mb-2" style={{
                      background: 'rgba(180, 205, 237, 0.2)'
                    }}>
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(item.progress * 100)}%`,
                          background: 'var(--sogni-gradient)',
                          boxShadow: '0 0 12px rgba(180, 205, 237, 0.5)'
                        }}
                      />
                    </div>
                    <p className="text-center text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
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
                    {item.etaSeconds !== undefined && item.etaSeconds > 0 && (
                      <p className="text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {Math.round(item.progress * 100)}% complete
                      </p>
                    )}
                  </div>
                </div>
              ) : item.resultUrl ? (
                /* Show completed result */
                originalImage ? (
                  <div 
                    className="w-full h-full cursor-pointer"
                    onClick={() => onSelect(item.resultUrl!)}
                  >
                    <BeforeAfterCompare
                      beforeImage={originalImage}
                      afterImage={item.resultUrl}
                    />
                  </div>
                ) : (
                  <img
                    src={item.resultUrl}
                    alt={`Result ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => onSelect(item.resultUrl!)}
                  />
                )
              ) : null}
            </div>

            {/* Result Number Badge and Action Button */}
            <div className="flex items-center justify-between flex-shrink-0">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: item.generating ? 'rgba(180, 205, 237, 0.1)' : 'var(--sogni-gradient-subtle)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                {item.generating ? 'Generating...' : `Result ${index + 1}`}
              </span>
              {onDownload && item.resultUrl && !item.generating && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(item.resultUrl!);
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8125rem',
                    fontWeight: 500
                  }}
                >
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

