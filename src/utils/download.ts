/**
 * Download utilities
 * Enhanced with mobile support and backend proxy for CORS-protected images
 */

import { downloadImageMobile, isMobile } from './mobileDownload';

/**
 * Download an image with mobile-optimized handling and backend proxy for CORS
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

    // For blob URLs (already in memory), download directly
    if (url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For remote URLs, use backend proxy to add proper download headers
    // This triggers native OS download dialog and avoids CORS issues
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to download image:', error);
    throw error;
  }
}

