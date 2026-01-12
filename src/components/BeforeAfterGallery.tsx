import React, { useState } from 'react';

interface GalleryItem {
  before: string;
  after: string;
}

interface BeforeAfterGalleryProps {
  items?: GalleryItem[];
}

// Default placeholder images - user will replace these later
const defaultItems: GalleryItem[] = [
  {
    before: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=500&fit=crop',
    after: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop'
  },
  {
    before: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=500&fit=crop',
    after: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=500&fit=crop'
  },
  {
    before: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=500&fit=crop',
    after: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=500&fit=crop'
  },
  {
    before: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop',
    after: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop'
  }
];

export const BeforeAfterGallery: React.FC<BeforeAfterGalleryProps> = ({ 
  items = defaultItems 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div className="w-full py-8 lg:py-12">
      <div className="text-center mb-10 lg:mb-12">
        <h3 className="text-xl lg:text-2xl font-bold mb-3" style={{
          background: 'var(--sogni-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.02em'
        }}>
          ✨ See Our Restoration Magic
        </h3>
        <p className="text-sm lg:text-base" style={{
          color: 'var(--color-text-secondary)',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Browse our gallery of restored memories. Each image tells a story of transformation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-w-6xl mx-auto px-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="fade-in group relative"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both',
              opacity: 0,
              aspectRatio: '4/3',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Container with split view */}
            <div className="absolute inset-0 flex" style={{
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {/* Before Image - Left Side */}
              <div 
                className="relative flex-1 overflow-hidden transition-all duration-500 ease-out"
                style={{
                  transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transitionDelay: '0s'
                }}
              >
                <img
                  src={item.before}
                  alt="Before restoration"
                  className="w-full h-full object-cover"
                  style={{
                    filter: hoveredIndex === index ? 'brightness(0.7)' : 'brightness(0.9)',
                    transition: 'filter 0.5s ease'
                  }}
                />
                <div 
                  className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(52, 73, 102, 0.9)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 12px rgba(52, 73, 102, 0.4)'
                  }}
                >
                  BEFORE
                </div>
                {/* Gradient overlay */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right, rgba(0,0,0,0.1), transparent)',
                    opacity: hoveredIndex === index ? 0.3 : 0.2,
                    transition: 'opacity 0.5s ease'
                  }}
                />
              </div>

              {/* Divider Line */}
              <div 
                className="absolute top-0 bottom-0 left-1/2 w-1 z-10"
                style={{
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.9) 100%)',
                  boxShadow: '0 0 20px rgba(52, 73, 102, 0.5), inset 0 0 10px rgba(255,255,255,0.5)',
                  transition: 'all 0.3s ease'
                }}
              />

              {/* After Image - Right Side */}
              <div 
                className="relative flex-1 overflow-hidden transition-all duration-500 ease-out"
                style={{
                  transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transitionDelay: '0s'
                }}
              >
                <img
                  src={item.after}
                  alt="After restoration"
                  className="w-full h-full object-cover"
                  style={{
                    filter: hoveredIndex === index ? 'brightness(1)' : 'brightness(0.95)',
                    transition: 'filter 0.5s ease'
                  }}
                />
                <div 
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(180, 205, 237, 0.9)',
                    backdropFilter: 'blur(8px)',
                    color: 'white',
                    letterSpacing: '0.05em',
                    boxShadow: '0 2px 12px rgba(180, 205, 237, 0.4)'
                  }}
                >
                  AFTER
                </div>
                {/* Gradient overlay */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to left, rgba(0,0,0,0.1), transparent)',
                    opacity: hoveredIndex === index ? 0.3 : 0.2,
                    transition: 'opacity 0.5s ease'
                  }}
                />
              </div>
            </div>

            {/* Hover overlay effect */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: hoveredIndex === index 
                  ? 'radial-gradient(circle at center, transparent 40%, rgba(52, 73, 102, 0.05) 100%)'
                  : 'transparent',
                transition: 'background 0.5s ease',
                borderRadius: 'var(--radius-lg)'
              }}
            />

            {/* Outer border/shadow */}
            <div 
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                border: '2px solid rgba(52, 73, 102, 0.15)',
                boxShadow: hoveredIndex === index
                  ? '0 12px 48px rgba(52, 73, 102, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  : '0 4px 24px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                transition: 'all 0.5s ease',
                borderRadius: 'var(--radius-lg)'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

