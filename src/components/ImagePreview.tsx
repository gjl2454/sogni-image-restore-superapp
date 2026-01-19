import React from 'react';
import { ResultsCarousel } from './ResultsCarousel';
import { ResultsGridWithSliders } from './ResultsGridWithSliders';
import { ResultModal } from './ResultModal';

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

interface ImagePreviewProps {
  imageUrl: string;
  originalUrl?: string;
  restoredUrls?: string[];
  restorationJobs?: RestorationJob[];
  selectedUrl?: string | null;
  selectedJobIndex?: number | null;
  onRestore?: () => void;
  onSelectResult?: (url: string, jobIndex?: number) => void;
  onClearSelection?: () => void;
  isRestoring?: boolean;
  progress?: number;
  etaSeconds?: number;
  completedCount?: number;
  totalCount?: number;
  onDownload?: (url: string) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  originalUrl,
  restoredUrls = [],
  restorationJobs = [],
  selectedUrl = null,
  selectedJobIndex = null,
  onRestore,
  onSelectResult,
  onClearSelection,
  isRestoring = false,
  progress = 0,
  etaSeconds,
  completedCount = 0,
  totalCount = 0,
  onDownload
}) => {
  const hasResults = restoredUrls.length > 0;
  const hasPlaceholders = restorationJobs.length > 0;
  const showComparison = originalUrl && selectedUrl;
  // Show results grid if we have results OR placeholders (photobooth pattern)
  const showResultsGrid = (hasResults || hasPlaceholders) && !selectedUrl;
  const displayUrl = selectedUrl || imageUrl;

  // Get completed jobs sorted by index for navigation
  const completedJobs = restorationJobs
    .filter(job => job.resultUrl !== null)
    .sort((a, b) => a.index - b.index);
  
  // Find position in completed jobs array using selectedJobIndex
  const positionInCompleted = selectedJobIndex !== null
    ? completedJobs.findIndex(job => job.index === selectedJobIndex)
    : -1;
  
  console.log('[NAV] Navigation state:', {
    selectedJobIndex,
    positionInCompleted,
    completedJobsCount: completedJobs.length,
    completedJobsIndices: completedJobs.map(j => j.index),
    canGoPrevious: positionInCompleted > 0,
    canGoNext: positionInCompleted >= 0 && positionInCompleted < completedJobs.length - 1
  });
  
  const canGoPrevious = positionInCompleted > 0;
  const canGoNext = positionInCompleted >= 0 && positionInCompleted < completedJobs.length - 1;
  
  const handlePrevious = () => {
    console.log('[NAV] handlePrevious CALLED', { positionInCompleted, canGoPrevious });
    if (canGoPrevious && onSelectResult) {
      const prevJob = completedJobs[positionInCompleted - 1];
      console.log('[NAV] Selecting previous job:', prevJob.index, prevJob.resultUrl?.substring(0, 50));
      // Pass both URL and job index to ensure correct selection
      onSelectResult(prevJob.resultUrl!, prevJob.index);
    } else {
      console.log('[NAV] Cannot go previous:', { canGoPrevious, hasHandler: !!onSelectResult });
    }
  };

  const handleNext = () => {
    console.log('[NAV] handleNext CALLED', { positionInCompleted, canGoNext });
    if (canGoNext && onSelectResult) {
      const nextJob = completedJobs[positionInCompleted + 1];
      console.log('[NAV] Selecting next job:', nextJob.index, nextJob.resultUrl?.substring(0, 50));
      // Pass both URL and job index to ensure correct selection
      onSelectResult(nextJob.resultUrl!, nextJob.index);
    } else {
      console.log('[NAV] Cannot go next:', { canGoNext, hasHandler: !!onSelectResult });
    }
  };

  return (
    <>
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Show progress indicator for ongoing restoration ABOVE the results */}
      {isRestoring && hasResults && (
        <div className="flex-shrink-0 px-2 py-1.5 rounded-lg" style={{
          background: 'linear-gradient(135deg, rgba(180, 205, 237, 0.1), rgba(194, 148, 255, 0.1))',
          border: '1px solid rgba(180, 205, 237, 0.2)'
        }}>
          <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <span className="font-medium" style={{ fontSize: '0.8125rem' }}>
              {completedCount}/{totalCount} restored
            </span>
            <span className="gradient-accent font-semibold" style={{ fontSize: '0.8125rem' }}>
              {etaSeconds !== undefined && etaSeconds > 0
                ? (() => {
                    if (etaSeconds < 60) return `${Math.ceil(etaSeconds)}s remaining`;
                    const minutes = Math.floor(etaSeconds / 60);
                    const remainingSeconds = Math.ceil(etaSeconds % 60);
                    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s remaining` : `${minutes}m remaining`;
                  })()
                : 'Processing...'
              }
            </span>
          </div>
        </div>
      )}
      
      {showResultsGrid ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ResultsGridWithSliders
            results={restoredUrls}
            restorationJobs={restorationJobs}
            originalImage={originalUrl}
            onSelect={onSelectResult!}
            onDownload={onDownload}
            modelName="Restoration"
          />
        </div>
      ) : !selectedUrl ? (
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
          <div className="overflow-auto flex items-center justify-center flex-1 min-h-0 image-preview-container" style={{
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-light)',
            padding: '1rem',
            position: 'relative'
          }}>
            {/* Image wrapper with overlay */}
            <div className="relative" style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              minWidth: 0,
              minHeight: 0
            }}>
              <img
                src={displayUrl}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
              {isRestoring && (
                <>
                  {/* Clean gradient overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                  }} />
                  
                  {/* Progress bar and info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                    {/* Sparkle effect */}
                    <div className="flex justify-center mb-3">
                      <div className="text-4xl animate-pulse" style={{
                        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))',
                        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}>
                        ✨
                      </div>
                    </div>
                    
                    {/* Progress percentage or ETA */}
                    <p className="text-center text-2xl font-bold text-white mb-2" style={{ 
                      letterSpacing: '-0.02em',
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)'
                    }}>
                      {etaSeconds !== undefined && etaSeconds > 0 
                        ? (() => {
                            if (etaSeconds < 60) return `${Math.ceil(etaSeconds)}s`;
                            const minutes = Math.floor(etaSeconds / 60);
                            const remainingSeconds = Math.ceil(etaSeconds % 60);
                            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
                          })()
                        : `${Math.min(Math.round(progress * 100), 100)}%`
                      }
                    </p>
                    
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
                    }}>
                      <div 
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${Math.min(Math.round(progress * 100), 100)}%`,
                          background: 'var(--sogni-gradient)',
                          boxShadow: '0 0 12px rgba(52, 73, 102, 0.5)'
                        }}
                      />
                    </div>
                    
                    {/* Status text */}
                    <p className="text-center text-sm text-white/90 mt-2" style={{
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                    }}>
                      {completedCount > 0 && totalCount > 0
                        ? `Restoring... (${completedCount}/${totalCount} complete)`
                        : 'Restoring your photo...'
                      }
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>

    {/* Result Modal - Shows when user selects a result */}
    {selectedUrl && onDownload && (
      <ResultModal
        isOpen={true}
        imageUrl={selectedUrl}
        onClose={onClearSelection || (() => {})}
        onDownload={() => onDownload(selectedUrl)}
        currentIndex={positionInCompleted >= 0 ? positionInCompleted : undefined}
        totalResults={completedJobs.length > 1 ? completedJobs.length : undefined}
        onPrevious={canGoPrevious ? handlePrevious : undefined}
        onNext={canGoNext ? handleNext : undefined}
      />
    )}
  </>
  );
};

