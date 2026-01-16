/**
 * WebShare.ts
 * Service for handling Web Share API functionality
 */

/**
 * Generic share using Web Share API
 * Works on mobile and some desktop browsers (like Safari on Mac)
 * 
 * @param imageUrl - The image URL to share
 * @param filename - The filename for the share
 * @param title - Optional title for the share
 * @param text - Optional text for the share
 * @returns Promise that resolves if share was successful, rejects if cancelled or failed
 */
export const shareViaWebShare = async (
  imageUrl: string,
  filename: string,
  title: string = 'My Restored Photo',
  text: string = 'Check out my restored photo from Sogni AI Restoration!'
): Promise<void> => {
  try {
    // Fetch the image and convert to blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image for sharing');
    }
    
    const blob = await response.blob();
    
    // Create a file from the blob
    const shareFile = new File([blob], filename, { type: blob.type });
    
    // Check if Web Share API is available and supports files
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({
          files: [shareFile],
          title,
          text
        });
        console.log('Successfully shared via Web Share API');
        return;
      } catch (shareError: any) {
        // User cancelled or share failed
        if (shareError.name === 'AbortError') {
          console.log('User cancelled share');
          return; // Don't throw - user cancellation is expected
        }
        // For other errors, log and continue silently
        console.log('Web Share completed with potential error:', shareError);
        return; // Don't show error popup - user may have successfully shared
      }
    } else {
      // Web Share API not supported
      throw new Error('Native sharing is not supported on this browser. Please use the download button instead.');
    }
  } catch (error) {
    console.error('Error in Web Share:', error);
    throw error;
  }
};

/**
 * Check if Web Share API is supported on this device
 * @returns boolean
 */
export const isWebShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 
         navigator.share !== undefined && 
         navigator.canShare !== undefined;
};

/**
 * Share to Twitter (opens Twitter in new window)
 */
export const shareToTwitter = (imageUrl: string, text: string = 'Check out my restored photo!'): void => {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(imageUrl)}`;
  window.open(twitterUrl, '_blank', 'noopener,noreferrer');
};
