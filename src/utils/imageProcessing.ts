/**
 * Image processing utilities
 */

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPG, PNG, or WEBP image.'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB.`
    };
  }

  return { valid: true };
}

export async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export function createImageUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeImageUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

