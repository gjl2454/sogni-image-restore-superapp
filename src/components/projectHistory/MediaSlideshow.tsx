import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { SogniClient } from '@sogni-ai/sogni-client';
import type { ArchiveProject, ArchiveJob } from '../../types/projectHistory';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { useFavorites } from '../../hooks/useFavorites';
import { getCachedFavorite } from '../../utils/favoritesDB';
import type { FavoriteImage } from '../../services/favoritesService';
import './MediaSlideshow.css';

interface MediaSlideshowProps {
  project: ArchiveProject;
  initialJobId: string;
  sogniClient: SogniClient;
  onClose: () => void;
  onDeleteJob?: (projectId: string, jobId: string) => void;
  favoritesOnly?: boolean; // If true, only show favorited images
}

const MediaSlideshow: React.FC<MediaSlideshowProps> = ({
  project,
  initialJobId,
  sogniClient,
  onClose,
  onDeleteJob,
  favoritesOnly = false
}) => {
  const { favorites, isFavorite, toggle } = useFavorites();
  const [isClosing, setIsClosing] = useState(false);

  // Handle close with fade-out animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  // Create a Set of favorite job IDs for efficient lookup and reactivity
  const favoriteJobIds = useMemo(() => {
    return new Set(favorites.map(f => f.jobId));
  }, [favorites]);
  
  // Get all completed, visible jobs, optionally filtered to favorites only
  // CRITICAL: For combined favorites projects, rebuild from favorites array to ensure real-time updates
  const completedJobs = useMemo(() => {
    // For combined favorites projects, rebuild the jobs list from the current favorites array
    // This ensures the counter updates immediately when favorites change, even if project prop is stale
    if (favoritesOnly && project.id === 'combined-favorites') {
      // Create a map of jobId -> job from project.jobs for quick lookup
      const jobMap = new Map<string, ArchiveJob>();
      project.jobs.forEach(job => {
        if (job.status === 'completed' && !job.hidden && !job.isNSFW) {
          jobMap.set(job.id, job);
        }
      });
      
      // Build jobs array in the EXACT order of the favorites array
      // This ensures:
      // 1. Counter matches grid order (top-left to bottom-right)
      // 2. Counter updates immediately when favorites change (length = favorites.length)
      // 3. All favorites are included, even if not in project.jobs yet (via placeholder jobs)
      const jobs: ArchiveJob[] = [];
      favorites.forEach(favorite => {
        const job = jobMap.get(favorite.jobId);
        if (job) {
          // Use the real job from project.jobs
          jobs.push(job);
        } else {
          // Job not found in project.jobs yet (newly hearted from any batch)
          // Create a placeholder job so it can be displayed immediately
          // IMPORTANT: Use the favorite's jobId so SlideshowContent can find it by jobId
          const placeholderJob: ArchiveJob = {
            id: favorite.jobId, // Use favorite's jobId so it can be matched
            projectId: 'current-session', // Mark as placeholder so SlideshowContent uses favorite URL
            type: 'image',
            status: 'completed',
            createdAt: favorite.createdAt || Date.now(),
            endTime: favorite.createdAt || Date.now(),
            hidden: false,
            isNSFW: false
          };
          jobs.push(placeholderJob);
        }
      });
      
      // Return jobs in favorites order - length ALWAYS matches favorites.length
      return jobs;
    }
    
    // For regular projects, filter normally
    let jobs = project.jobs.filter(j => j.status === 'completed' && !j.hidden && !j.isNSFW);
    
    if (favoritesOnly) {
      const favoriteJobIds = new Set(favorites.map(f => f.jobId));
      jobs = jobs.filter(j => favoriteJobIds.has(j.id));
    }
    
    // Sort by creation time for regular projects
    return jobs.sort((a, b) => a.createdAt - b.createdAt);
  }, [project.jobs, project.id, favoritesOnly, favorites]); // Re-compute when favorites change

  // Find initial job index - recalculate whenever completedJobs or initialJobId changes
  const initialIndex = useMemo(() => {
    const idx = completedJobs.findIndex(j => j.id === initialJobId);
    return idx >= 0 ? idx : 0;
  }, [completedJobs, initialJobId]);

  // Initialize currentIndex - calculate directly from completedJobs to avoid stale closure
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Calculate index on first render
    const idx = completedJobs.findIndex(j => j.id === initialJobId);
    return idx >= 0 ? idx : 0;
  });
  
  // Track the current job ID we're viewing (for when the list changes)
  const currentJobIdRef = useRef<string | null>(initialJobId);
  
  // Track the last initialJobId to detect when it changes
  const lastInitialJobIdRef = useRef(initialJobId);
  
  // Update index when initialJobId changes
  // Only update when the user explicitly clicks a different image, not when completedJobs changes
  // This prevents infinite loops and preserves navigation state
  useEffect(() => {
    if (completedJobs.length === 0) {
      return; // Don't update if no jobs available yet
    }
    
    // Only update if initialJobId changed (user clicked a different image)
    const initialJobIdChanged = initialJobId !== lastInitialJobIdRef.current;
    
    if (!initialJobIdChanged) {
      // initialJobId hasn't changed, so don't update the index
      // This allows arrow navigation to work without interference
      return;
    }
    
    // Recalculate the index for the initialJobId in the current completedJobs list
    const newIndex = completedJobs.findIndex(j => j.id === initialJobId);
    
    // Use functional update to compare with current state
    setCurrentIndex(prevIndex => {
      if (newIndex >= 0) {
        currentJobIdRef.current = initialJobId;
        lastInitialJobIdRef.current = initialJobId;
        return newIndex;
      } else {
        // initialJobId not found in completedJobs - this shouldn't happen, but fallback to 0
        console.warn('[MediaSlideshow] initialJobId not found in completedJobs, using index 0:', {
          initialJobId,
          completedJobsLength: completedJobs.length,
          completedJobIds: completedJobs.map(j => j.id)
        });
        currentJobIdRef.current = completedJobs[0]?.id || null;
        lastInitialJobIdRef.current = initialJobId;
        return 0;
      }
    });
  }, [initialJobId, completedJobs]);
  
  // Ensure currentIndex is always within bounds
  const safeCurrentIndex = useMemo(() => {
    if (completedJobs.length === 0) return 0;
    if (currentIndex < 0) return 0;
    if (currentIndex >= completedJobs.length) return completedJobs.length - 1;
    return currentIndex;
  }, [currentIndex, completedJobs.length]);
  
  // If currentIndex is out of bounds, correct it immediately
  useEffect(() => {
    if (completedJobs.length > 0 && (currentIndex < 0 || currentIndex >= completedJobs.length)) {
      const correctedIndex = Math.max(0, Math.min(currentIndex, completedJobs.length - 1));
      if (correctedIndex !== currentIndex) {
        setCurrentIndex(correctedIndex);
      }
    }
  }, [currentIndex, completedJobs.length]);
  
  // Update the ref when currentIndex changes (so we track which job we're viewing)
  const currentJob = completedJobs[safeCurrentIndex];
  useEffect(() => {
    if (currentJob) {
      currentJobIdRef.current = currentJob.id;
    }
  }, [currentJob]);
  
  // Log when currentIndex or completedJobs change (throttled to prevent spam)
  // Remove the logging effect to prevent console spam
  // The state updates are handled by the other useEffects


  const handlePrevious = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setCurrentIndex(prev => {
      // Access completedJobs from the closure - it's stable because it's a memoized value
      // Calculate maxIndex inside the functional update to ensure we have the latest value
      const currentLength = completedJobs.length;
      const maxIndex = currentLength - 1;
      if (maxIndex < 0) return prev; // Safety check
      const calculatedNewIndex = prev > 0 ? prev - 1 : maxIndex;
      return calculatedNewIndex;
    });
  }, [completedJobs]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setCurrentIndex(prev => {
      // Access completedJobs from the closure - it's stable because it's a memoized value
      // Calculate maxIndex inside the functional update to ensure we have the latest value
      const currentLength = completedJobs.length;
      const maxIndex = currentLength - 1;
      if (maxIndex < 0) return prev; // Safety check
      const calculatedNewIndex = prev < maxIndex ? prev + 1 : 0;
      return calculatedNewIndex;
    });
  }, [completedJobs]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, onClose]);

  const handleDeleteJob = useCallback(() => {
    if (onDeleteJob && currentJob) {
      onDeleteJob(project.id, currentJob.id);
    }
  }, [onDeleteJob, project.id, currentJob]);

  // Get the current image URL from SlideshowContent for download/print
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!currentImageUrl || !currentJob) return;

    try {
      const filename = `restored-${currentJob.id}.png`;

      // First, try to get the cached blob from IndexedDB (for favorited images)
      const cachedFavorite = await getCachedFavorite(currentJob.id);

      if (cachedFavorite) {
        // Use the cached blob directly - most reliable for favorited images
        console.log('[MediaSlideshow] Using cached blob for download');
        const url = URL.createObjectURL(cachedFavorite.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For non-cached images, proxy through backend to add proper download headers
        // This triggers native OS download dialog
        console.log('[MediaSlideshow] Using backend download proxy');
        const downloadUrl = `/api/download?url=${encodeURIComponent(currentImageUrl)}&filename=${encodeURIComponent(filename)}`;

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('[MediaSlideshow] Download failed:', error);
      alert('Failed to download image. Please try again.');
    }
  }, [currentImageUrl, currentJob]);

  // Handle print
  const handlePrint = useCallback(() => {
    if (!currentImageUrl) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print images.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Restored Image</title>
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
            }
            @media print {
              body {
                margin: 0;
              }
              img {
                max-width: 100%;
                height: auto;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <img src="${currentImageUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [currentImageUrl]);

  if (completedJobs.length === 0) {
    return (
      <div className={`media-slideshow-overlay ${isClosing ? 'closing' : ''}`}>
        <div className="media-slideshow-content">
          <div className="media-slideshow-error">
            <p>No media available to view</p>
            <button onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Guard against undefined currentJob
  if (!currentJob) {
    console.error('[MediaSlideshow] currentJob is undefined:', {
      currentIndex,
      completedJobsLength: completedJobs.length,
      completedJobIds: completedJobs.map(j => j.id)
    });
    return (
      <div className={`media-slideshow-overlay ${isClosing ? 'closing' : ''}`}>
        <div className="media-slideshow-content">
          <div className="media-slideshow-error">
            <p>Error: Unable to load image</p>
            <button onClick={handleClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Get model name from current favorite if it's a placeholder job (from favorites)
  // Otherwise use the project's model name
  const currentFavorite = useMemo(() => {
    if (currentJob.projectId === 'current-session') {
      return favorites.find(f => f.jobId === currentJob.id);
    }
    return null;
  }, [currentJob, favorites]);

  const displayModelName = currentFavorite?.modelName || project.model.name;

  // Normalize URL for comparison (remove query parameters, etc.)
  const normalizeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url;
    }
  };

  // Check if current job is favorited by jobId OR by URL (matches JobItem behavior)
  const isCurrentJobFavorited = useMemo(() => {
    if (!currentJob) return false;

    // First check by jobId
    if (isFavorite(currentJob.id)) {
      return true;
    }

    // Also check by URL in case the favorite was created with a different jobId
    if (currentImageUrl) {
      const normalizedUrl = normalizeUrl(currentImageUrl);
      return favorites.some(fav => {
        const normalizedFavUrl = normalizeUrl(fav.url);
        return normalizedFavUrl === normalizedUrl || fav.url === currentImageUrl;
      });
    }

    return false;
  }, [currentJob, currentImageUrl, isFavorite, favorites]);

  return (
    <div className={`media-slideshow-overlay ${isClosing ? 'closing' : ''}`}>
      <div className="media-slideshow-content">
        {/* Header with close and delete buttons */}
        <div className="media-slideshow-top-bar">
          <div className="media-slideshow-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="media-slideshow-counter">
                {(() => {
                  // For combined favorites projects, use favorites.length for total count
                  // This ensures counter updates immediately when favorites change
                  // completedJobs.length should always equal favorites.length for combined favorites
                  const totalCount = (favoritesOnly && project.id === 'combined-favorites') 
                    ? favorites.length 
                    : completedJobs.length;
                  // Current position is based on safeCurrentIndex (0-based) + 1
                  const currentPosition = safeCurrentIndex + 1;
                  return totalCount > 0 
                    ? `${currentPosition} / ${totalCount}`
                    : '0 / 0';
                })()}
              </span>
              <button
                className="media-slideshow-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                aria-label="Download image"
                title="Download this image"
                disabled={!currentImageUrl}
                style={{
                  background: 'rgba(123, 163, 208, 0.2)',
                  border: '1px solid rgba(123, 163, 208, 0.4)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: currentImageUrl ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  transition: 'all 0.2s ease',
                  opacity: currentImageUrl ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (currentImageUrl) {
                    e.currentTarget.style.background = 'rgba(123, 163, 208, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(123, 163, 208, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>⬇️</span>
                <span>Download</span>
              </button>
              <button
                className="media-slideshow-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrint();
                }}
                aria-label="Print image"
                title="Print this image"
                disabled={!currentImageUrl}
                style={{
                  background: 'rgba(123, 163, 208, 0.2)',
                  border: '1px solid rgba(123, 163, 208, 0.4)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: currentImageUrl ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  transition: 'all 0.2s ease',
                  opacity: currentImageUrl ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (currentImageUrl) {
                    e.currentTarget.style.background = 'rgba(123, 163, 208, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(123, 163, 208, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>🖨️</span>
                <span>Print</span>
              </button>
              {onDeleteJob && (
                <button
                  className="media-slideshow-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteJob();
                  }}
                  aria-label="Delete current image"
                  title="Delete this image"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          <button
            className="media-slideshow-close"
            onClick={handleClose}
            aria-label="Close slideshow"
          >
            ×
          </button>
        </div>
        
        {completedJobs.length > 1 && (
          <>
            <button
              className="media-slideshow-nav media-slideshow-prev"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handlePrevious(e);
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className="media-slideshow-nav media-slideshow-next"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleNext(e);
              }}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}

        <SlideshowContent
          job={currentJob}
          sogniClient={sogniClient}
          active={true}
          modelName={displayModelName}
          onUrlLoaded={setCurrentImageUrl}
          isFavorited={isCurrentJobFavorited}
          onToggleFavorite={async () => {
            if (!currentJob || !currentImageUrl) return;

            // Check if there's an existing favorite by URL (might have different jobId)
            const normalizedUrl = normalizeUrl(currentImageUrl);
            const existingFavorite = favorites.find(fav => {
              if (fav.jobId === currentJob.id) return true;
              const normalizedFavUrl = normalizeUrl(fav.url);
              return normalizedFavUrl === normalizedUrl || fav.url === currentImageUrl;
            });

            const favoriteImage: FavoriteImage = existingFavorite || {
              jobId: currentJob.id,
              projectId: project.id,
              url: currentImageUrl,
              createdAt: Date.now(),
              modelName: displayModelName
            };
            await toggle(favoriteImage);
          }}
        />
      </div>
    </div>
  );
};

interface SlideshowContentProps {
  job: ArchiveJob;
  sogniClient: SogniClient;
  active: boolean;
  modelName: string;
  onUrlLoaded?: (url: string | null) => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

function SlideshowContent({ job, sogniClient, active, modelName, onUrlLoaded, isFavorited, onToggleFavorite }: SlideshowContentProps) {
  const { favorites } = useFavorites();

  // For placeholder jobs (from favorites not in visibleProjects), use the favorite's stored URL
  // Match by jobId first, but also handle cases where jobId might be a placeholder
  const favoriteData = useMemo(() => {
    // First try to find by jobId
    const found = favorites.find(f => f.jobId === job.id);
    if (!found && job.projectId === 'current-session') {
      // For placeholder jobs, if not found by jobId, this is a problem
      // The combined project should have included the favorite
      console.warn('[SlideshowContent] Placeholder job without matching favorite:', {
        jobId: job.id,
        projectId: job.projectId,
        favoritesCount: favorites.length,
        favoriteJobIds: favorites.map(f => f.jobId)
      });
    }
    return found;
  }, [favorites, job.id, job.projectId]);

  // If we have favorite data and the job is a placeholder (projectId is 'current-session'),
  // use the favorite's URL directly. Otherwise, fetch via useMediaUrl (for jobs from project history)
  const isPlaceholderJob = job.projectId === 'current-session';
  const shouldUseFavoriteUrl = !!favoriteData && isPlaceholderJob;

  const { url: mediaUrl, loading, error } = useMediaUrl({
    projectId: job.projectId,
    jobId: job.id,
    type: job.type,
    sogniClient,
    enabled: !shouldUseFavoriteUrl && job.projectId !== 'current-session' && !!sogniClient // Skip useMediaUrl if using favorite URL or if it's a placeholder without favorite data
  });

  // Use favorite URL if available (for placeholder jobs), otherwise use mediaUrl
  // If mediaUrl is not available and we have a favorite, use the favorite URL as fallback
  const url = shouldUseFavoriteUrl ? favoriteData!.url : (mediaUrl || favoriteData?.url);
  const isLoading = shouldUseFavoriteUrl ? false : (loading && !favoriteData?.url);

  // Notify parent when URL changes
  useEffect(() => {
    if (onUrlLoaded) {
      onUrlLoaded(url || null);
    }
  }, [url, onUrlLoaded]);

  if (isLoading) {
    return (
      <div className="slideshow-loading">
        <div className="slideshow-spinner" />
      </div>
    );
  }

  if ((error && !shouldUseFavoriteUrl && !favoriteData?.url) || (!url && !isLoading)) {
    return (
      <div className="slideshow-error">
        <span>⚠️</span>
        <span>{error || 'Media not available'}</span>
      </div>
    );
  }

  // For restoration app, we only handle images - no animation, instant switch
  return (
    <div className="slideshow-image-wrapper">
      <div className="slideshow-image-container">
        <img
          src={url}
          alt={`Restored photo ${job.id.slice(0, 8)}`}
          className="slideshow-image"
        />
        {/* Heart button on image */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            className="slideshow-heart-button"
          >
            {isFavorited ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#7BA3D0"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="white"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default MediaSlideshow;
