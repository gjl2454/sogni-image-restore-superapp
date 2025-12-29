import React from 'react';

interface ResultsGridProps {
  results: string[];
  selectedUrl: string | null;
  onSelect: (url: string) => void;
  onDownload?: (url: string) => void;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  results,
  selectedUrl,
  onSelect,
  onDownload
}) => {
  if (results.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      {/* Instructions */}
      <div className="text-center">
        <p className="font-semibold" style={{
          color: 'var(--color-text-primary)',
          fontSize: '0.9375rem',
          marginBottom: '0.25rem'
        }}>
          Choose Your Favorite Result
        </p>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.8125rem'
        }}>
          {selectedUrl ? 'Click another to change your selection' : 'Click on an image to select it'}
        </p>
      </div>

      {/* Grid of Results */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 results-grid-container">
        {results.map((url, index) => {
          const isSelected = selectedUrl === url;
          return (
            <div
              key={url}
              onClick={() => onSelect(url)}
              className="relative cursor-pointer group transition-all duration-200 result-card"
              style={{
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: isSelected 
                  ? '3px solid var(--sogni-purple)' 
                  : '2px solid var(--color-border)',
                boxShadow: isSelected 
                  ? '0 0 0 2px rgba(138, 35, 235, 0.2)' 
                  : 'var(--shadow-sm)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* Result Number Badge */}
              <div 
                className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full text-xs font-semibold result-badge"
                style={{
                  background: isSelected 
                    ? 'var(--sogni-gradient)' 
                    : 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  backdropFilter: 'blur(4px)'
                }}
              >
                #{index + 1}
              </div>

              {/* Selected Badge */}
              {isSelected && (
                <div 
                  className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 result-badge"
                  style={{
                    background: 'var(--sogni-gradient)',
                    color: 'white'
                  }}
                >
                  <span>✓</span>
                  <span>Selected</span>
                </div>
              )}

              {/* Image Container */}
              <div 
                className="relative w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden"
                style={{
                  background: 'var(--color-bg)'
                }}
              >
                <img
                  src={url}
                  alt={`Result ${index + 1}`}
                  className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-90"
                />
                
                {/* Hover Overlay */}
                {!isSelected && (
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center"
                  >
                    <div 
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-3 py-1.5 rounded-full text-sm font-medium"
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: 'var(--sogni-purple)'
                      }}
                    >
                      Select
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Download Selected Button */}
      {selectedUrl && onDownload && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => onDownload(selectedUrl)}
            className="btn-primary"
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.9375rem',
              fontWeight: 600
            }}
          >
            Download Selected Result
          </button>
        </div>
      )}
    </div>
  );
};

