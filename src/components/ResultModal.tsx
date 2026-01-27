import React from 'react';
import { createPortal } from 'react-dom';
import { useFavorites } from '../hooks/useFavorites';
import type { FavoriteImage } from '../services/favoritesService';

interface ResultModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onDownload: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  currentIndex?: number;
  totalResults?: number;
  onPrevious?: () => void;
  onNext?: () => void;
  // For favorites functionality
  jobId?: string;
  projectId?: string;
  modelName?: string;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onDownload,
  onPrint,
  onShare,
  currentIndex,
  totalResults,
  onPrevious,
  onNext,
  jobId,
  projectId,
  modelName
}) => {
  const { isFavorite, toggle } = useFavorites();

  const handleToggleFavorite = async () => {
    if (!jobId || !imageUrl) return;

    const favoriteImage: FavoriteImage = {
      jobId,
      projectId: projectId || `temp-${Date.now()}`,
      url: imageUrl,
      createdAt: Date.now(),
      modelName
    };
    await toggle(favoriteImage);
  };

  const isCurrentFavorite = jobId ? isFavorite(jobId) : false;

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

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999999
      }}
      onClick={onClose}
    >
      {/* Modal Content Card */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col"
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'visible',
          width: '90vw',
          maxHeight: '90vh'
        }}
      >
        {/* Previous Arrow - Absolute position on white card */}
        {totalResults && totalResults > 1 && onPrevious && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPrevious();
            }}
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              color: 'white',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              cursor: 'pointer',
              transform: 'translateY(-50%)',
              zIndex: 10,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            ‹
          </button>
        )}

        {/* Next Arrow - Absolute position on white card */}
        {totalResults && totalResults > 1 && onNext && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNext();
            }}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              color: 'white',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              cursor: 'pointer',
              transform: 'translateY(-50%)',
              zIndex: 10,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            ›
          </button>
        )}

        {/* Top Bar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            background: 'var(--color-bg-elevated)',
            borderBottom: '1px solid var(--color-border)',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            {currentIndex !== undefined && totalResults && totalResults > 1 && (
              <span style={{
                color: 'var(--color-text-secondary)',
                fontSize: '0.875rem'
              }}>
                {currentIndex + 1} / {totalResults}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: 'none',
              color: 'white',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              marginLeft: '16px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Image Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            minHeight: '400px',
            overflow: 'auto'
          }}
        >
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={imageUrl}
              alt="Restored"
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 200px)',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                display: 'block'
              }}
            />

            {/* Floating heart button on image */}
            {jobId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite();
                }}
                aria-label={isCurrentFavorite ? 'Remove from favorites' : 'Add to favorites'}
                title={isCurrentFavorite ? 'Remove from favorites' : 'Add to favorites'}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(8px)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {isCurrentFavorite ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#7BA3D0"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="white"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <button
            onClick={handleShare}
            style={{
              background: 'rgba(123, 163, 208, 0.2)',
              border: '1px solid rgba(123, 163, 208, 0.4)',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(123, 163, 208, 0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(123, 163, 208, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>↗</span>
            <span>Share</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            style={{
              background: 'rgba(123, 163, 208, 0.2)',
              border: '1px solid rgba(123, 163, 208, 0.4)',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(123, 163, 208, 0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(123, 163, 208, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>⬇️</span>
            <span>Download</span>
          </button>

          {onPrint && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
              style={{
                background: 'rgba(123, 163, 208, 0.2)',
                border: '1px solid rgba(123, 163, 208, 0.4)',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(123, 163, 208, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(123, 163, 208, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
