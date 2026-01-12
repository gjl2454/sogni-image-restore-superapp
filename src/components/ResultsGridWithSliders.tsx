import React, { useState } from 'react';
import { BeforeAfterCompare } from './BeforeAfterCompare';

interface ResultsGridWithSlidersProps {
  results: string[];
  originalImage?: string;
  onSelect: (url: string) => void;
  onDownload?: (url: string) => void;
}

export const ResultsGridWithSliders: React.FC<ResultsGridWithSlidersProps> = ({
  results,
  originalImage,
  onSelect,
  onDownload
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (results.length === 0) return null;

  // Determine grid columns based on number of results
  const getGridCols = () => {
    if (results.length === 2) return 'grid-cols-1 md:grid-cols-2';
    if (results.length === 4) return 'grid-cols-2';
    if (results.length === 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2';
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
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
          Compare before and after for each restoration
        </p>
      </div>

      {/* Grid of Results */}
      <div className={`grid ${getGridCols()} gap-4 flex-1 min-h-0 pb-4 px-2`}>
        {results.map((resultUrl, index) => (
          <div
            key={resultUrl}
            className="flex flex-col gap-2 fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both',
              opacity: 0
            }}
          >
            {/* Before/After Slider Container */}
            <div
              className="relative rounded-lg overflow-hidden transition-all duration-300"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                aspectRatio: '3 / 4',
                background: 'var(--color-bg-elevated)',
                boxShadow: hoveredIndex === index
                  ? '0 16px 56px rgba(180, 205, 237, 0.5), 0 0 0 2px rgba(180, 205, 237, 0.3), 0 0 60px rgba(180, 205, 237, 0.6), 0 0 100px rgba(180, 205, 237, 0.4)'
                  : '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--color-border-light)',
                transform: hoveredIndex === index ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid var(--color-border-light)'
              }}
            >
              {originalImage ? (
                <div 
                  className="w-full h-full cursor-pointer"
                  onClick={() => onSelect(resultUrl)}
                >
                  <BeforeAfterCompare
                    beforeImage={originalImage}
                    afterImage={resultUrl}
                  />
                </div>
              ) : (
                <img
                  src={resultUrl}
                  alt={`Result ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onSelect(resultUrl)}
                />
              )}
            </div>

            {/* Result Number Badge and Action Button */}
            <div className="flex items-center justify-between flex-shrink-0">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--sogni-gradient-subtle)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                Result {index + 1}
              </span>
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(resultUrl);
                  }}
                  className="btn-secondary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.8125rem',
                    fontWeight: 500
                  }}
                >
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

