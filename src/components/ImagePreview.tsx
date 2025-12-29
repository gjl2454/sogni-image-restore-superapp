import React from 'react';

interface ImagePreviewProps {
  imageUrl: string;
  originalUrl?: string;
  restoredUrl?: string;
  onRestore?: () => void;
  isRestoring?: boolean;
  progress?: number;
  onDownload?: (url: string) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  originalUrl,
  restoredUrl,
  onRestore,
  isRestoring = false,
  progress = 0,
  onDownload
}) => {
  const showComparison = originalUrl && restoredUrl;
  const displayUrl = restoredUrl || imageUrl;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {showComparison ? (
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
            <div className="relative overflow-hidden flex items-center justify-center flex-1 min-h-0" style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-light)'
            }}>
              <img
                src={originalUrl}
                alt="Original"
                className="max-w-full max-h-full object-contain"
              />
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
              Restored
            </h3>
            <div className="relative overflow-hidden flex items-center justify-center flex-1 min-h-0" style={{
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-light)'
            }}>
              <img
                src={displayUrl}
                alt="Restored"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {onDownload && (
              <button
                onClick={() => onDownload(restoredUrl!)}
                className="w-full btn-primary flex-shrink-0"
                style={{
                  padding: '0.625rem 1rem',
                  fontSize: '0.875rem'
                }}
              >
                Download Restored
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
          <div className="relative overflow-hidden flex items-center justify-center flex-1 min-h-0" style={{
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-light)'
          }}>
            <img
              src={displayUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
            {isRestoring && (
              <div className="absolute inset-0 flex items-center justify-center" style={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)'
              }}>
                <div className="text-center text-white">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-transparent mb-3" style={{
                    borderTopColor: 'var(--sogni-pink)',
                    borderRightColor: 'var(--sogni-purple)'
                  }}></div>
                  <p className="text-sm font-medium" style={{ letterSpacing: '0.02em' }}>
                    Restoring... {Math.min(Math.round(progress * 100), 100)}%
                  </p>
                </div>
              </div>
            )}
          </div>
          {!restoredUrl && !isRestoring && onRestore && (
            <button
              onClick={onRestore}
              className="w-full btn-primary flex-shrink-0"
              style={{
                padding: '0.875rem 1.5rem',
                fontSize: '1rem'
              }}
            >
              Restore Photo
            </button>
          )}
        </div>
      )}
    </div>
  );
};

