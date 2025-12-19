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
    <div className="space-y-4">
      {showComparison ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Original</h3>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={originalUrl}
                alt="Original"
                className="w-full h-auto"
              />
            </div>
            {onDownload && (
              <button
                onClick={() => onDownload(originalUrl)}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium text-sm"
              >
                Download Original
              </button>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Restored</h3>
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={displayUrl}
                alt="Restored"
                className="w-full h-auto"
              />
            </div>
            {onDownload && (
              <button
                onClick={() => onDownload(restoredUrl!)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                Download Restored
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={displayUrl}
              alt="Preview"
              className="w-full h-auto"
            />
            {isRestoring && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                  <p className="text-sm">Restoring... {Math.round(progress * 100)}%</p>
                </div>
              </div>
            )}
          </div>
          {!restoredUrl && !isRestoring && onRestore && (
            <button
              onClick={onRestore}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium text-lg"
            >
              Restore Photo
            </button>
          )}
        </div>
      )}
    </div>
  );
};

