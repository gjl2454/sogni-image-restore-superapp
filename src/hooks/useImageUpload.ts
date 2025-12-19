import { useState, useCallback } from 'react';
import { validateImageFile, fileToUint8Array, createImageUrl, revokeImageUrl, getImageDimensions } from '../utils/imageProcessing';

interface UseImageUploadResult {
  file: File | null;
  imageUrl: string | null;
  imageData: Uint8Array | null;
  width: number;
  height: number;
  error: string | null;
  upload: (file: File) => Promise<void>;
  clear: () => void;
}

export function useImageUpload(): UseImageUploadResult {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<Uint8Array | null>(null);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (uploadedFile: File) => {
    setError(null);

    // Validate file
    const validation = validateImageFile(uploadedFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      // Get image dimensions
      const dimensions = await getImageDimensions(uploadedFile);
      setWidth(dimensions.width);
      setHeight(dimensions.height);

      // Create preview URL
      const url = createImageUrl(uploadedFile);
      setImageUrl(url);

      // Convert to Uint8Array
      const data = await fileToUint8Array(uploadedFile);
      setImageData(data);

      setFile(uploadedFile);
    } catch (err: any) {
      console.error('[UPLOAD] Failed to process image:', err);
      setError(err.message || 'Failed to process image');
    }
  }, []);

  const clear = useCallback(() => {
    if (imageUrl) {
      revokeImageUrl(imageUrl);
    }
    setFile(null);
    setImageUrl(null);
    setImageData(null);
    setWidth(1024);
    setHeight(1024);
    setError(null);
  }, [imageUrl]);

  return {
    file,
    imageUrl,
    imageData,
    width,
    height,
    error,
    upload,
    clear
  };
}

