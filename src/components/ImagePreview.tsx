import React from 'react';
import { ResultsCarousel } from './ResultsCarousel';

interface ImagePreviewProps {
  imageUrl: string;
  originalUrl?: string;
  restoredUrls?: string[];
  selectedUrl?: string | null;
  onRestore?: () => void;
  onSelectResult?: (url: string) => void;
  onClearSelection?: () => void;
  isRestoring?: boolean;
  progress?: number;
  onDownload?: (url: string) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  originalUrl,
  restoredUrls = [],
  selectedUrl = null,
  onRestore,
  onSelectResult,
  onClearSelection,
  isRestoring = false,
  progress = 0,
  onDownload
}) => {
  const hasResults = restoredUrls.length > 0;
  const showComparison = originalUrl && selectedUrl;
  const showResultsGrid = hasResults && !selectedUrl;
  const displayUrl = selectedUrl || imageUrl;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {showResultsGrid ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ResultsCarousel
            results={restoredUrls}
            originalImage={originalUrl}
            onSelect={onSelectResult!}
            onDownload={onDownload}
          />
        </div>
      ) : showComparison ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 min-h-0">
            <h3 className="text-sm font-semibold flex-shrink-0 text-center" style={{
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontSize: '0.75rem'
            }}>
              Original
            </h3>
            <div className="relative overflow-auto flex items-center justify-center flex-1 min-h-0 image-preview-container" style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-light)',
              padding: '1rem',
              position: 'relative'
            }}>
              <div style={{
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
                  src={originalUrl}
                  alt="Original"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>
            </div>
            {onDownload && (
              <button
                onClick={() => onDownload(originalUrl)}
                className="w-full btn-secondary flex-shrink-0"
                style={{
                  padding: '0.625rem 1rem',
                  fontSize: '0.875rem'
                }}
              >
                Download Original
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3 min-h-0">
            <h3 className="text-sm font-semibold flex-shrink-0 text-center gradient-accent" style={{
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontSize: '0.75rem'
            }}>
              Selected Result
            </h3>
            <div className="relative overflow-auto flex items-center justify-center flex-1 min-h-0 image-preview-container" style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-light)',
              padding: '1rem',
              position: 'relative'
            }}>
              <div style={{
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
                  alt="Selected Result"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {onClearSelection && restoredUrls.length > 1 && (
                <button
                  onClick={onClearSelection}
                  className="flex-1 btn-secondary"
                  style={{
                    padding: '0.625rem 1rem',
                    fontSize: '0.875rem'
                  }}
                >
                  Choose Different
                </button>
              )}
              {onDownload && selectedUrl && (
                <button
                  onClick={() => onDownload(selectedUrl)}
                  className="flex-1 btn-primary"
                  style={{
                    padding: '0.625rem 1rem',
                    fontSize: '0.875rem'
                  }}
                >
                  Download Selected
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
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
                    
                    {/* Progress percentage */}
                    <p className="text-center text-2xl font-bold text-white mb-2" style={{ 
                      letterSpacing: '-0.02em',
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)'
                    }}>
                      {Math.min(Math.round(progress * 100), 100)}%
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
                          boxShadow: '0 0 12px rgba(138, 35, 235, 0.6)'
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
                      Restoring your photo...
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

