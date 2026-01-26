import JSZip from 'jszip';

/**
 * Downloads multiple images as a ZIP file
 * @param images - Array of image objects with {url, filename} properties
 * @param zipFilename - Name for the output ZIP file
 * @param onProgress - Callback for progress updates (current, total, message)
 * @returns Promise<boolean> - Success status
 */
export async function downloadImagesAsZip(
  images: Array<{ url: string; filename: string }>,
  zipFilename: string = 'sogni-restoration-images.zip',
  onProgress?: (current: number, total: number, message: string) => void
): Promise<boolean> {
  try {
    if (!images || images.length === 0) {
      console.warn('No images to download');
      return false;
    }

    const zip = new JSZip();
    const totalImages = images.length;

    // Report initial progress
    if (onProgress) {
      onProgress(0, totalImages, 'Starting download preparation...');
    }

    // Add each image to the ZIP
    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      try {
        if (onProgress) {
          onProgress(i, totalImages, `Adding image ${i + 1} of ${totalImages}...`);
        }

        let blob: Blob;

        // Check if it's a blob URL (already in memory)
        if (image.url.startsWith('blob:')) {
          // Fetch the blob directly
          const response = await fetch(image.url);
          if (!response.ok) {
            console.warn(`Failed to fetch blob image ${i + 1}: ${image.filename}`);
            continue;
          }
          blob = await response.blob();
        } else {
          // For remote URLs, use backend proxy to avoid CORS issues
          const proxyUrl = `/api/download?url=${encodeURIComponent(image.url)}&filename=${encodeURIComponent(image.filename)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch image ${i + 1}: ${image.filename}`);
            continue;
          }
          blob = await response.blob();
        }

        // Add to ZIP with the specified filename
        zip.file(image.filename, blob);

      } catch (error) {
        console.error(`Error adding image ${i + 1} to ZIP:`, error);
        // Continue with other images even if one fails
      }
    }

    // Generate the ZIP file
    if (onProgress) {
      onProgress(totalImages, totalImages, 'Generating ZIP file...');
    }

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6 // Balance between size and speed (1-9)
        }
      },
      (metadata) => {
        // Report compression progress
        if (onProgress && metadata.percent) {
          onProgress(
            totalImages,
            totalImages,
            `Compressing... ${Math.round(metadata.percent)}%`
          );
        }
      }
    );

    // Download the ZIP file
    if (onProgress) {
      onProgress(totalImages, totalImages, 'Downloading ZIP file...');
    }

    const blobUrl = URL.createObjectURL(zipBlob);

    // For mobile, open the ZIP file in a new tab/window
    // For desktop, trigger automatic download
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.open(blobUrl, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = zipFilename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Clean up blob URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);

    if (onProgress) {
      onProgress(totalImages, totalImages, 'Download complete!');
    }

    return true;

  } catch (error) {
    console.error('Error creating ZIP file:', error);
    if (onProgress) {
      onProgress(0, 0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return false;
  }
}

/**
 * Downloads multiple videos as a ZIP file
 * @param videos - Array of video objects with {url, filename} properties
 * @param zipFilename - Name for the output ZIP file
 * @param onProgress - Callback for progress updates (current, total, message)
 * @returns Promise<boolean> - Success status
 */
export async function downloadVideosAsZip(
  videos: Array<{ url: string; filename: string }>,
  zipFilename: string = 'sogni-restoration-videos.zip',
  onProgress?: (current: number, total: number, message: string) => void
): Promise<boolean> {
  try {
    if (!videos || videos.length === 0) {
      console.warn('No videos to download');
      return false;
    }

    const zip = new JSZip();
    const totalVideos = videos.length;

    // Report initial progress
    if (onProgress) {
      onProgress(0, totalVideos, 'Starting video download preparation...');
    }

    // Add each video to the ZIP
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];

      try {
        if (onProgress) {
          onProgress(i, totalVideos, `Adding video ${i + 1} of ${totalVideos}...`);
        }

        let blob: Blob;

        // Check if it's a blob URL (already in memory)
        if (video.url.startsWith('blob:')) {
          // Fetch the blob directly
          const response = await fetch(video.url);
          if (!response.ok) {
            console.warn(`Failed to fetch blob video ${i + 1}: ${video.filename}`);
            continue;
          }
          blob = await response.blob();
        } else {
          // For remote URLs, use backend proxy to avoid CORS issues
          const proxyUrl = `/api/download?url=${encodeURIComponent(video.url)}&filename=${encodeURIComponent(video.filename)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch video ${i + 1}: ${video.filename}`);
            continue;
          }
          blob = await response.blob();
        }

        // Add to ZIP with the specified filename
        zip.file(video.filename, blob);

      } catch (error) {
        console.error(`Error adding video ${i + 1} to ZIP:`, error);
        // Continue with other videos even if one fails
      }
    }

    // Generate the ZIP file
    if (onProgress) {
      onProgress(totalVideos, totalVideos, 'Generating ZIP file...');
    }

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6 // Balance between size and speed (1-9)
        }
      },
      (metadata) => {
        // Report compression progress
        if (onProgress && metadata.percent) {
          onProgress(
            totalVideos,
            totalVideos,
            `Compressing... ${Math.round(metadata.percent)}%`
          );
        }
      }
    );

    // Download the ZIP file
    if (onProgress) {
      onProgress(totalVideos, totalVideos, 'Downloading ZIP file...');
    }

    const blobUrl = URL.createObjectURL(zipBlob);

    // For mobile, open the ZIP file in a new tab/window
    // For desktop, trigger automatic download
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.open(blobUrl, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = zipFilename;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Clean up blob URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);

    if (onProgress) {
      onProgress(totalVideos, totalVideos, 'Download complete!');
    }

    return true;

  } catch (error) {
    console.error('Error creating video ZIP file:', error);
    if (onProgress) {
      onProgress(0, 0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return false;
  }
}
