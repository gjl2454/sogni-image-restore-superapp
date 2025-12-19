import React from 'react';

interface ProgressIndicatorProps {
  progress: number;
  message?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress, message }) => {
  const percentage = Math.round(progress * 100);

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>{message || 'Restoring...'}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

