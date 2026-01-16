/**
 * Download utilities
 * Enhanced with mobile support
 */

import { downloadImageMobile, isMobile } from './mobileDownload';

/**
 * Download an image with mobile-optimized handling
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    // Use mobile-optimized download if on mobile device
    if (isMobile()) {
      const success = await downloadImageMobile(url, filename);
      if (success) {
        return;
      }
      // If mobile download fails, fall through to standard download
    }

    // Standard download for desktop or mobile fallback
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Failed to download image:', error);
    throw error;
  }
}

