import React, { useState, useRef } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.min(Math.max(percentage, 0), 100));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative select-none cursor-ew-resize flex items-center"
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        justifyContent: 'center'
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
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
        className="absolute inset-0 overflow-hidden flex items-center"
        style={{ 
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          justifyContent: 'center',
          zIndex: 2
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

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-1 cursor-ew-resize"
        style={{
          left: `${sliderPosition}%`,
          background: 'linear-gradient(to bottom, var(--sogni-pink), var(--sogni-purple))',
          boxShadow: '0 0 0 2px white, 0 0 10px rgba(0,0,0,0.3)',
          transform: 'translateX(-50%)',
          zIndex: 20
        }}
      >
        {/* Slider Handle */}
        <div
          className="absolute top-1/2 left-1/2 w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'white',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4L3 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--sogni-purple)' }}/>
            <path d="M13 4L17 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--sogni-pink)' }}/>
          </svg>
        </div>
      </div>

      {/* Before/After Labels */}
      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-semibold pointer-events-none" style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        color: 'white',
        zIndex: 30
      }}>
        Before
      </div>
      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-sm font-semibold pointer-events-none" style={{
        background: 'var(--sogni-gradient)',
        color: 'white',
        boxShadow: '0 2px 8px rgba(138, 35, 235, 0.3)',
        zIndex: 30
      }}>
        After
      </div>
    </div>
  );
};

