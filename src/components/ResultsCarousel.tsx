import React, { useState, useEffect, useCallback } from 'react';
import { BeforeAfterCompare } from './BeforeAfterCompare';

interface ResultsCarouselProps {
  results: string[];
  originalImage?: string;
  onSelect: (url: string) => void;
  onDownload?: (url: string) => void;
}

export const ResultsCarousel: React.FC<ResultsCarouselProps> = ({
  results,
  originalImage,
  onSelect,
  onDownload
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  if (results.length === 0) return null;

  const currentResult = results[currentIndex];
  
  // Dramatic reveal animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? results.length - 1 : prev - 1));
  }, [results.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === results.length - 1 ? 0 : prev + 1));
  }, [results.length]);

  const handleSelectCurrent = useCallback(() => {
    onSelect(currentResult);
  }, [currentResult, onSelect]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectCurrent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, handleSelectCurrent]);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Header with instructions */}
      <div className="text-center flex-shrink-0">
        <p className="font-semibold" style={{
          color: 'var(--color-text-primary)',
          fontSize: '0.9375rem',
          marginBottom: '0.25rem'
        }}>
          Review Your Results
        </p>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.8125rem'
        }}>
          Navigate through {results.length} variations and pick your favorite
        </p>
      </div>

      {/* Main image display */}
      <div 
        className="flex-1 min-h-0 relative overflow-hidden flex items-center" 
        style={{
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          justifyContent: 'center',
          touchAction: 'pan-y pinch-zoom',
          opacity: isRevealed ? 1 : 0,
          transform: isRevealed ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Result number badge */}
        <div 
          className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: 'var(--sogni-gradient)',
            color: 'white',
            boxShadow: '0 2px 8px rgba(138, 35, 235, 0.3)',
            zIndex: 40
          }}
        >
          Result {currentIndex + 1} of {results.length}
        </div>

        {/* Previous button */}
        {results.length > 1 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 p-3 rounded-full transition-all duration-200 hover:scale-110 carousel-nav-button"
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              cursor: 'pointer',
              zIndex: 40
            }}
            aria-label="Previous result"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        {/* Image or Comparison - wrapped to capture hover only on image */}
        {showComparison && originalImage ? (
          <div 
            className="absolute inset-0 flex items-center"
            style={{ 
              justifyContent: 'center',
              pointerEvents: 'auto'
            }}
          >
            <BeforeAfterCompare
              beforeImage={originalImage}
              afterImage={currentResult}
            />
          </div>
        ) : (
          <img
            src={currentResult}
            alt={`Result ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
            onMouseEnter={() => originalImage && setShowComparison(true)}
          />
        )}
        
        {/* Hover hint - shows once on mount */}
        {originalImage && !showComparison && isRevealed && (
          <div 
            className="absolute bottom-4 left-1/2 px-3 py-1.5 rounded-full text-xs font-medium pointer-events-none"
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              animation: 'fadeInOut 4s ease-in-out 0.5s forwards',
              opacity: 0,
              zIndex: 40,
              transform: 'translateX(-50%)'
            }}
          >
            💡 Hover to compare before & after
          </div>
        )}

        {/* Next button */}
        {results.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 p-3 rounded-full transition-all duration-200 hover:scale-110 carousel-nav-button"
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              cursor: 'pointer',
              zIndex: 40
            }}
            aria-label="Next result"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail navigation dots */}
      {results.length > 1 && (
        <div className="flex justify-center gap-2 flex-shrink-0">
          {results.map((url, index) => (
            <button
              key={url}
              onClick={() => setCurrentIndex(index)}
              className="transition-all duration-200"
              style={{
                width: currentIndex === index ? '32px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: currentIndex === index 
                  ? 'var(--sogni-gradient)' 
                  : 'var(--color-border)',
                border: 'none',
                cursor: 'pointer',
                opacity: currentIndex === index ? 1 : 0.5
              }}
              aria-label={`Go to result ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-shrink-0">
        <button
          onClick={handleSelectCurrent}
          className="flex-1 btn-primary"
          style={{
            padding: '0.875rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: 600
          }}
        >
          Select This Result
        </button>
        {onDownload && (
          <button
            onClick={() => onDownload(currentResult)}
            className="btn-secondary"
            style={{
              padding: '0.875rem 1.25rem',
              fontSize: '0.9375rem'
            }}
            title="Download this result"
          >
            ↓
          </button>
        )}
      </div>

      {/* Navigation hint */}
      {results.length > 1 && (
        <p className="text-center text-xs flex-shrink-0" style={{
          color: 'var(--color-text-tertiary)',
          marginTop: '-0.5rem'
        }}>
          <span className="hidden md:inline">Use arrow keys or </span>swipe to navigate
        </p>
      )}
    </div>
  );
};

