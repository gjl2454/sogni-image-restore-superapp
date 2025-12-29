import React from 'react';

interface ProgressIndicatorProps {
  progress: number;
  message?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress, message }) => {
  // Ensure progress is normalized to 0-1 range and capped at 100%
  const normalizedProgress = progress > 1 ? progress / 100 : progress;
  const percentage = Math.min(Math.round(normalizedProgress * 100), 100);

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between" style={{
        fontSize: '0.875rem',
        color: 'var(--color-text-primary)',
        fontWeight: 500
      }}>
        <span>{message || 'Restoring...'}</span>
        <span className="gradient-accent" style={{ fontWeight: 600 }}>{percentage}%</span>
      </div>
      <div className="w-full rounded-full h-2 overflow-hidden" style={{
        background: 'var(--color-bg)'
      }}>
        <div
          className="h-full"
          style={{ 
            width: `${percentage}%`,
            background: 'var(--sogni-gradient)',
            transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 12px rgba(255, 97, 213, 0.4)'
          }}
        />
      </div>
    </div>
  );
};

