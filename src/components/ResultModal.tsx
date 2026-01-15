import React from 'react';

interface ResultModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onDownload: () => void;
  onShare?: () => void;
  currentIndex?: number;
  totalResults?: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onDownload,
  onShare,
  currentIndex,
  totalResults,
  onPrevious,
  onNext
}) => {
  console.log('[MODAL] Rendered with props:', {
    isOpen,
    currentIndex,
    totalResults,
    hasOnPrevious: !!onPrevious,
    hasOnNext: !!onNext,
    willRenderPrev: totalResults && totalResults > 1 && !!onPrevious,
    willRenderNext: totalResults && totalResults > 1 && !!onNext
  });
  
  if (!isOpen) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'restored-photo.jpg', { type: 'image/jpeg' });
        
        await navigator.share({
          title: 'My Restored Photo',
          text: 'Check out my restored photo from Sogni Restoration!',
          files: [file]
        });
      } catch (error) {
        console.log('Share failed:', error);
        // Fallback: copy link
        if (onShare) onShare();
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      if (onShare) onShare();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50"
      style={{
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      {/* Close Button - Fixed position */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="fixed top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          zIndex: 60
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ✕
      </button>

      {/* Previous Arrow - Fixed position */}
      {totalResults && totalResults > 1 && onPrevious && (
        <button
          onClick={(e) => {
            console.log('[MODAL BUTTON] Previous clicked!', { onPrevious: !!onPrevious });
            e.preventDefault();
            e.stopPropagation();
            if (onPrevious) {
              console.log('[MODAL BUTTON] Calling onPrevious');
              onPrevious();
            }
          }}
          className="fixed left-4 top-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '1.5rem',
            transform: 'translateY(-50%)',
            zIndex: 100,
            pointerEvents: 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          ‹
        </button>
      )}

      {/* Next Arrow - Fixed position */}
      {totalResults && totalResults > 1 && onNext && (
        <button
          onClick={(e) => {
            console.log('[MODAL BUTTON] Next clicked!', { onNext: !!onNext });
            e.preventDefault();
            e.stopPropagation();
            if (onNext) {
              console.log('[MODAL BUTTON] Calling onNext');
              onNext();
            }
          }}
          className="fixed right-4 top-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '1.5rem',
            transform: 'translateY(-50%)',
            zIndex: 100,
            pointerEvents: 'auto'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          ›
        </button>
      )}

      {/* Modal Content - Centered */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
      >
        <div 
          className="relative flex flex-col items-center gap-6 pointer-events-auto"
          style={{
            animation: 'slideUp 0.3s ease-out'
          }}
        >
        {/* Image */}
        <img
          src={imageUrl}
          alt="Restored"
          style={{
            maxWidth: '80vw',
            maxHeight: '70vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
          }}
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>↗</span>
            <span>Share</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200"
            style={{
              background: 'var(--sogni-gradient)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(180, 205, 237, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(180, 205, 237, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(180, 205, 237, 0.3)';
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>⬇</span>
            <span>Download</span>
          </button>
        </div>

        {/* Result Counter */}
        {currentIndex !== undefined && totalResults && totalResults > 1 && (
          <div 
            className="text-center mt-4"
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              fontWeight: 500
            }}
          >
            {currentIndex + 1} of {totalResults}
          </div>
        )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
