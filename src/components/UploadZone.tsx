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
      className="card-premium text-center cursor-pointer"
      style={{
        padding: '4rem 1.5rem',
        border: isDragging ? '2px dashed var(--sogni-pink)' : '2px dashed var(--color-border)',
        background: isDragging ? 'var(--sogni-gradient-subtle)' : 'var(--color-bg-elevated)',
        transition: 'all var(--transition-base)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      <div className="space-y-1">
        <div style={{ 
          fontSize: '2rem',
          lineHeight: 1,
          filter: isDragging ? 'brightness(1.2)' : 'none',
          transition: 'all var(--transition-base)'
        }}>
          📷
        </div>
        <div>
          <p className="font-semibold" style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
            marginBottom: '0.125rem',
            lineHeight: 1.1
          }}>
            {isDragging ? '✨ Drop your photo here' : 'Drag & drop your photo'}
          </p>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.1
          }}>
            or click to browse your files
          </p>
        </div>
        <div style={{
          fontSize: '0.625rem',
          color: 'var(--color-text-tertiary)',
          letterSpacing: '0.02em',
          lineHeight: 1.1
        }}>
          Supports JPG, PNG, WEBP • Max 10MB
        </div>
      </div>
    </div>
  );
};

