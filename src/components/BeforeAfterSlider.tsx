import React, { useState, useRef, useCallback, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After'
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      updatePosition(e.clientX);
    } else if (isHovering) {
      updatePosition(e.clientX);
    }
  }, [isDragging, isHovering, updatePosition]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (!isDragging) {
      setSliderPosition(50); // Reset to center when not hovering
    }
  }, [isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches.length > 0 && containerRef.current) {
      updatePosition(e.touches[0].clientX);
    }
  }, [isDragging, updatePosition]);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        updatePosition(e.clientX);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp, handleTouchMove, updatePosition]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden select-none"
      style={{ 
        aspectRatio: '896 / 1200',
        width: '100%',
        maxWidth: 'min(400px, 90vw)',
        height: 'auto',
        margin: '0 auto',
        cursor: isDragging ? 'grabbing' : 'ew-resize',
        touchAction: 'none',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(52, 73, 102, 0.15)',
        border: '2px solid rgba(52, 73, 102, 0.2)',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* After Image (Full) */}
      <div className="absolute inset-0">
        <img
          src={afterImage}
          alt={afterLabel}
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div 
          className="absolute top-4 right-4 px-4 py-2 text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, rgba(180, 205, 237, 0.95) 0%, rgba(180, 205, 237, 0.9) 100%)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(180, 205, 237, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(12px)',
            letterSpacing: '0.025em'
          }}
        >
          {afterLabel}
        </div>
      </div>

      {/* Before Image (Clipped) */}
      <div 
        className="absolute inset-0"
        style={{ 
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
        }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div 
          className="absolute top-4 left-4 px-4 py-2 text-sm font-semibold"
          style={{
            background: 'linear-gradient(135deg, rgba(52, 73, 102, 0.95) 0%, rgba(52, 73, 102, 0.9) 100%)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(52, 73, 102, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(12px)',
            letterSpacing: '0.025em'
          }}
        >
          {beforeLabel}
        </div>
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
          zIndex: 10
        }}
      >
        {/* Soft glow behind line */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(52, 73, 102, 0.3) 0%, rgba(180, 205, 237, 0.3) 50%, rgba(52, 73, 102, 0.3) 100%)',
            filter: 'blur(16px)',
            width: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: isDragging || isHovering ? 0.9 : 0.6,
            transition: 'opacity 0.3s ease'
          }}
        />
        
        {/* Elegant divider line */}
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            boxShadow: isDragging || isHovering
              ? '0 0 28px rgba(52, 73, 102, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.8)'
              : '0 0 18px rgba(52, 73, 102, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.6)',
            width: '100%',
            transition: 'box-shadow 0.3s ease'
          }}
        />
        
        {/* Premium Slider Handle */}
        <div
          className="absolute top-1/2 left-1/2 flex items-center justify-center transition-all duration-300 ease-out"
          style={{
            transform: 'translate(-50%, -50%)',
            width: isDragging || isHovering ? '60px' : '54px',
            height: isDragging || isHovering ? '60px' : '54px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(24px)',
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          {/* Outer glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: isDragging || isHovering
                ? 'linear-gradient(135deg, rgba(52, 73, 102, 0.4), rgba(180, 205, 237, 0.4))'
                : 'linear-gradient(135deg, rgba(52, 73, 102, 0.25), rgba(180, 205, 237, 0.25))',
              filter: 'blur(12px)',
              transform: 'scale(1.2)',
              opacity: isDragging || isHovering ? 0.8 : 0.6,
              transition: 'all 0.3s ease',
              zIndex: -1
            }}
          />
          
          {/* Shadow layers */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: isDragging || isHovering
                ? '0 10px 48px rgba(52, 73, 102, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 0 4px rgba(52, 73, 102, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.9)'
                : '0 6px 32px rgba(52, 73, 102, 0.35), 0 0 0 1.5px rgba(255, 255, 255, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.9)',
              transition: 'box-shadow 0.3s ease',
              borderRadius: '50%'
            }}
          />
          
          {/* Gradient border ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              padding: '2px',
              background: isDragging || isHovering
                ? 'linear-gradient(135deg, rgba(52, 73, 102, 0.6), rgba(180, 205, 237, 0.6))'
                : 'linear-gradient(135deg, rgba(52, 73, 102, 0.4), rgba(180, 205, 237, 0.4))',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              transition: 'background 0.3s ease'
            }}
          />
          
          {/* Arrow icons container */}
          <div 
            className="flex items-center justify-center gap-2 relative z-10"
            style={{ 
              transform: isDragging || isHovering ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <svg width="16" height="20" viewBox="0 0 8 12" fill="none">
              <defs>
                <linearGradient id={`arrow-left-${sliderPosition}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(52, 73, 102)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="rgb(180, 205, 237)" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path 
                d="M6 2L2 6L6 10" 
                stroke={`url(#arrow-left-${sliderPosition})`}
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <svg width="16" height="20" viewBox="0 0 8 12" fill="none">
              <defs>
                <linearGradient id={`arrow-right-${sliderPosition}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgb(52, 73, 102)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="rgb(180, 205, 237)" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              <path 
                d="M2 2L6 6L2 10" 
                stroke={`url(#arrow-right-${sliderPosition})`}
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

