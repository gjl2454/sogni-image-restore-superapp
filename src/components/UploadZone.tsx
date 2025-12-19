import React, { useCallback, useState, useRef } from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      onFileSelect(imageFile);
    }
  }, [disabled, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      <div className="space-y-4">
        <div className="text-6xl">📷</div>
        <div>
          <p className="text-lg font-semibold text-gray-700">
            {isDragging ? 'Drop your photo here' : 'Drag & drop your damaged photo'}
          </p>
          <p className="text-sm text-gray-500 mt-2">or click to browse</p>
        </div>
        <p className="text-xs text-gray-400">
          Supports JPG, PNG, WEBP (Max 10MB)
        </p>
      </div>
    </div>
  );
};

