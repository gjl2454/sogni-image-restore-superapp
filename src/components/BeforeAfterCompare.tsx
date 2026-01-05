import React, { useState, useRef, useCallback, useEffect } from 'react';

interface BeforeAfterCompareProps {
  beforeImage: string;
  afterImage: string;
}

export const BeforeAfterCompare: React.FC<BeforeAfterCompareProps> = ({
  beforeImage,
  afterImage
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(percentage, 0), 100));
  }, []);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    } else if (isHovering) {
      handleMove(e.clientX);
    }
  }, [isDragging, isHovering, handleMove]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (!isDragging) {
      setSliderPosition(50);
    }
  }, [isDragging]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging && e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  }, [isDragging, handleMove]);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove as any);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove as any);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp, handleTouchMove, handleMove]);

  return (
    <div 
      ref={containerRef}
      className="relative select-none cursor-ew-resize flex items-center justify-center"
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* After Image (Full) - establishes dimensions */}
      <img
        src={afterImage}
        alt="After"
        className="max-w-full max-h-full object-contain"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
          position: 'relative',
          zIndex: 1
        }}
      />

      {/* Before Image (Clipped) - overlay */}
      <div 
        className="absolute inset-0 overflow-hidden flex items-center justify-center"
        style={{ 
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          zIndex: 2,
          transition: (isDragging || isHovering) ? 'none' : 'clip-path 0.3s ease'
        }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="max-w-full max-h-full object-contain"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      {/* Slider Divider */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: `${sliderPosition}%`,
          width: '2px',
          transform: 'translateX(-50%)',
          transition: (isDragging || isHovering) ? 'none' : 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          zIndex: 20
        }}
      >
        {/* Soft glow */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(138, 35, 235, 0.25) 0%, rgba(236, 72, 153, 0.25) 100%)',
            filter: 'blur(12px)',
            width: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: isDragging || isHovering ? 0.8 : 0.5,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Clean divider line */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            boxShadow: isDragging || isHovering
              ? '0 0 24px rgba(138, 35, 235, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.8)'
              : '0 0 16px rgba(138, 35, 235, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.7)',
            width: '100%',
            transition: 'box-shadow 0.3s ease'
          }}
        />
        
        {/* Minimal Handle */}
        <div
          className="absolute top-1/2 left-1/2 flex items-center justify-center transition-all duration-300"
          style={{
            transform: 'translate(-50%, -50%)',
            width: isDragging || isHovering ? '38px' : '36px',
            height: isDragging || isHovering ? '38px' : '36px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: '50%',
            boxShadow: isDragging || isHovering
              ? '0 6px 24px rgba(138, 35, 235, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 0 3px rgba(138, 35, 235, 0.15)'
              : '0 3px 16px rgba(138, 35, 235, 0.3), 0 0 0 1.5px rgba(255, 255, 255, 0.85)',
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* Simple arrows */}
          <div 
            className="flex items-center justify-center gap-1"
            style={{ 
              transform: isDragging || isHovering ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.3s ease'
            }}
          >
            <svg width="12" height="16" viewBox="0 0 8 12" fill="none">
              <defs>
                <linearGradient id={`compare-arrow-left-${sliderPosition}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(138, 35, 235)" />
                  <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                </linearGradient>
              </defs>
              <path 
                d="M6 2L2 6L6 10" 
                stroke={`url(#compare-arrow-left-${sliderPosition})`}
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <svg width="12" height="16" viewBox="0 0 8 12" fill="none">
              <defs>
                <linearGradient id={`compare-arrow-right-${sliderPosition}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(138, 35, 235)" />
                  <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                </linearGradient>
              </defs>
              <path 
                d="M2 2L6 6L2 10" 
                stroke={`url(#compare-arrow-right-${sliderPosition})`}
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Clean Labels */}
      <div 
        className="absolute top-16 left-4 px-3 py-1.5 rounded-full text-xs font-semibold pointer-events-none" 
        style={{
          background: 'rgba(138, 35, 235, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          letterSpacing: '0.05em',
          boxShadow: '0 2px 12px rgba(138, 35, 235, 0.4)',
          zIndex: 30
        }}
      >
        BEFORE
      </div>
      <div 
        className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold pointer-events-none" 
        style={{
          background: 'rgba(236, 72, 153, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          letterSpacing: '0.05em',
          boxShadow: '0 2px 12px rgba(236, 72, 153, 0.4)',
          zIndex: 30
        }}
      >
        AFTER
      </div>
    </div>
  );
};
