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
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (results.length === 0) return null;

  const currentResult = results[currentIndex];
  
  // Handle smooth transitions
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [currentIndex]);
  
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
        <p className="font-bold" style={{
          background: 'var(--sogni-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '1.0625rem',
          marginBottom: '0.375rem',
          letterSpacing: '-0.01em'
        }}>
          ✨ Review Your Results
        </p>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.8125rem',
          fontWeight: 500
        }}>
          Navigate through {results.length} {results.length === 1 ? 'variation' : 'variations'} and pick your favorite
        </p>
      </div>

      {/* Main image display */}
      <div 
        className="flex-1 min-h-0 relative overflow-auto image-preview-container" 
        style={{
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(52, 73, 102, 0.15)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(52, 73, 102, 0.1)',
          padding: '1rem',
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
          className="absolute top-5 left-5 px-4 py-2 rounded-full text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, rgba(52, 73, 102, 0.95) 0%, rgba(180, 205, 237, 0.95) 100%)',
            color: 'white',
            backdropFilter: 'blur(12px)',
            zIndex: 40,
            letterSpacing: '0.025em',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          Result {currentIndex + 1} of {results.length}
        </div>

        {/* Previous button */}
        {results.length > 1 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 carousel-nav-button"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(52, 73, 102, 0.2)',
              color: 'var(--sogni-purple)',
              cursor: 'pointer',
              zIndex: 40,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(52, 73, 102, 0.1)'
            }}
            aria-label="Previous result"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--sogni-gradient)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(52, 73, 102, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.color = 'var(--sogni-purple)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(52, 73, 102, 0.1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        )}

        {/* Image or Comparison - wrapped to capture hover only on image */}
        {showComparison && originalImage ? (
          <div 
            className="flex items-center justify-center"
            style={{ 
              width: '100%',
              height: '100%',
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
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
              opacity: isTransitioning ? 0.7 : 1,
              transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
              transition: 'opacity 0.3s ease-out, transform 0.3s ease-out'
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
            className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 carousel-nav-button"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(52, 73, 102, 0.2)',
              color: 'var(--sogni-purple)',
              cursor: 'pointer',
              zIndex: 40,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(52, 73, 102, 0.1)'
            }}
            aria-label="Next result"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--sogni-gradient)';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(52, 73, 102, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.color = 'var(--sogni-purple)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(52, 73, 102, 0.1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        )}
      </div>

      {/* Thumbnail navigation dots */}
      {results.length > 1 && (
        <div className="flex justify-center gap-3 flex-shrink-0 items-center py-2">
          {results.map((url, index) => (
            <button
              key={url}
              onClick={() => setCurrentIndex(index)}
              className="transition-all duration-300 ease-out"
              style={{
                width: currentIndex === index ? '36px' : '10px',
                height: '10px',
                borderRadius: '10px',
                background: currentIndex === index 
                  ? 'linear-gradient(135deg, rgba(52, 73, 102, 1) 0%, rgba(180, 205, 237, 1) 100%)' 
                  : 'rgba(52, 73, 102, 0.25)',
                border: currentIndex === index 
                  ? '2px solid rgba(255, 255, 255, 0.3)' 
                  : '2px solid transparent',
                boxShadow: currentIndex === index 
                  ? '0 2px 12px rgba(52, 73, 102, 0.4), 0 0 0 2px rgba(52, 73, 102, 0.1)' 
                  : 'none',
                cursor: 'pointer',
                opacity: currentIndex === index ? 1 : 0.6,
                transform: currentIndex === index ? 'scale(1.1)' : 'scale(1)'
              }}
              aria-label={`Go to result ${index + 1}`}
              onMouseEnter={(e) => {
                if (currentIndex !== index) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentIndex !== index) {
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 flex-shrink-0">
        <button
          onClick={handleSelectCurrent}
          className="flex-1 btn-primary transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            padding: '0.875rem 1.5rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(52, 73, 102, 0.3)',
            letterSpacing: '0.01em'
          }}
        >
          ✨ Select This Result
        </button>
        {onDownload && (
          <button
            onClick={() => onDownload(currentResult)}
            className="btn-secondary transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              padding: '0.875rem 1.25rem',
              fontSize: '1.125rem',
              minWidth: '48px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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

