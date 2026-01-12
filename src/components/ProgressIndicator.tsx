import React from 'react';

interface ProgressIndicatorProps {
  progress: number;
  message?: string;
  etaSeconds?: number;
  completedCount?: number;
  totalCount?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  progress, 
  message,
  etaSeconds,
  completedCount = 0,
  totalCount = 0
}) => {
  // Ensure progress is normalized to 0-1 range and capped at 100%
  const normalizedProgress = progress > 1 ? progress / 100 : progress;
  const percentage = Math.min(Math.round(normalizedProgress * 100), 100);

  // Format ETA for display
  const formatETA = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds <= 0) return '';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  // Build status message
  const statusMessage = (() => {
    if (completedCount > 0 && totalCount > 0) {
      return `Restoring... (${completedCount}/${totalCount} complete)`;
    }
    return message || 'Restoring...';
  })();

  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between" style={{
        fontSize: '0.875rem',
        color: 'var(--color-text-primary)',
        fontWeight: 500
      }}>
        <span>{statusMessage}</span>
        <span className="gradient-accent" style={{ fontWeight: 600 }}>
          {etaSeconds !== undefined && etaSeconds > 0 ? formatETA(etaSeconds) : `${percentage}%`}
        </span>
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
            boxShadow: '0 0 12px rgba(var(--rgb-light-blue), 0.5)'
          }}
        />
      </div>
    </div>
  );
};

