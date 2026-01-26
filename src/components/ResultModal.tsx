import React from 'react';
import { createPortal } from 'react-dom';

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
          <img
            src={imageUrl}
            alt="Restored"
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(90vh - 200px)',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)'
            }}
          />
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
