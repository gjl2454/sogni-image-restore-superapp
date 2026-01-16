import { useState, useEffect, useCallback, useRef } from 'react';
import type { SogniClient } from '@sogni-ai/sogni-client';
import type { MediaURL } from '../types/projectHistory';

// It is 1 hour, but set to 55 minutes just in case
const MEDIA_URL_TTL = 1000 * 60 * 55;

// Global cache for media URLs (persists across component mounts)
const mediaUrlCache = new Map<string, MediaURL>();

// Track hidden jobs to prevent re-fetching
const hiddenJobs = new Set<string>();

// Get hidden jobs from localStorage
function getHiddenJobsFromStorage(): Set<string> {
  try {
    const stored = localStorage.getItem('hiddenJobs');
    if (stored) {
      return new Set<string>(JSON.parse(stored));
    }
  } catch (error) {
    console.warn('[useMediaUrl] Failed to read hiddenJobs from localStorage:', error);
  }
  return new Set<string>();
}

// Sync hiddenJobs Set with localStorage
function syncHiddenJobs() {
  const stored = getHiddenJobsFromStorage();
  hiddenJobs.clear();
  stored.forEach(id => hiddenJobs.add(id));
}

interface UseMediaUrlOptions {
  projectId: string;
  jobId: string;
  type: 'image' | 'video';
  sogniClient: SogniClient | null;
  enabled?: boolean;
  onHideJob?: (projectId: string, jobId: string) => void;
}

/**
 * Simple URL existence check
 * Note: We skip the check for S3 URLs as they may require credentials
 * and the browser will handle CORS/authentication when loading the image
 */
async function checkIfUrlExists(url: string): Promise<boolean> {
  // Skip check for S3 URLs - they may require credentials that we can't send in a HEAD request
  // The browser will handle authentication when the image actually loads
  if (url.includes('s3.amazonaws.com') || url.includes('complete-images')) {
    return true; // Assume URL is valid, let the browser handle it
  }
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      credentials: 'include', // Include cookies for authenticated URLs
      mode: 'cors'
    });
    return response.ok;
  } catch {
    // If check fails, assume URL is valid and let browser handle it
    return true;
  }
}

export function useMediaUrl({
  projectId,
  jobId,
  type,
  sogniClient,
  enabled = true,
  onHideJob
}: UseMediaUrlOptions) {
  const [url, setUrl] = useState<MediaURL | null>(() => {
    // Check cache on initial render
    return mediaUrlCache.get(jobId) || null;
  });

  // Sync hidden jobs from localStorage on mount and when jobId changes
  useEffect(() => {
    syncHiddenJobs();
  }, [jobId]);

  // Track if this job has been hidden (check both Set and localStorage)
  const isHidden = useCallback(() => {
    syncHiddenJobs(); // Sync before checking
    return hiddenJobs.has(jobId) || getHiddenJobsFromStorage().has(jobId);
  }, [jobId]);
  
  const [isJobHidden, setIsJobHidden] = useState(() => isHidden());
  
  // Update hidden state when jobId changes
  useEffect(() => {
    setIsJobHidden(isHidden());
  }, [jobId, isHidden]);

  // Log when enabled state changes
  useEffect(() => {
    if (enabled && sogniClient) {
      console.log('[useMediaUrl] Enabled for job:', { jobId, projectId, type });
    }
  }, [enabled, jobId, projectId, type, sogniClient]);

  const refresh = useCallback(async () => {
    // Don't fetch if job is already hidden
    if (isHidden()) {
      console.log('[useMediaUrl] Skipping fetch for hidden job:', jobId);
      return;
    }

    if (!sogniClient || !enabled) return;

    // Check if we have a valid cached URL
    const cached = mediaUrlCache.get(jobId);
    if (cached && cached.expiresAt > Date.now() && !cached.refreshing && !cached.error) {
      setUrl(cached);
      return;
    }

    // Mark as refreshing
    const refreshingUrl: MediaURL = {
      value: cached?.value || null,
      updatedAt: cached?.updatedAt || 0,
      expiresAt: cached?.expiresAt || Date.now() + MEDIA_URL_TTL,
      projectId,
      jobId,
      type,
      refreshing: true
    };
    mediaUrlCache.set(jobId, refreshingUrl);
    setUrl(refreshingUrl);

    try {
      console.log('[useMediaUrl] Fetching URL for:', { projectId, jobId, type });
      let mediaUrl: string;

      // Use the SDK projects API to get download URLs
      // Note: projectId is the parent request ID (job batch), jobId is the individual image/video ID
      if (type === 'video') {
        mediaUrl = await sogniClient.projects.mediaDownloadUrl({
          jobId: projectId,
          id: jobId,
          type: 'complete'
        });
      } else {
        mediaUrl = await sogniClient.projects.downloadUrl({
          jobId: projectId,
          imageId: jobId,
          type: 'complete'
        });
      }

      console.log('[useMediaUrl] Got URL:', { jobId, url: mediaUrl });

      // For S3/signed URLs, skip the check - browser will handle authentication when loading
      // The URL check might fail with 403, but the browser can still load the image
      const isS3Url = mediaUrl.includes('s3.amazonaws.com') || mediaUrl.includes('complete-images');
      let isAvailable = true;
      
      if (!isS3Url) {
        // Only check non-S3 URLs
        isAvailable = await checkIfUrlExists(mediaUrl);
        console.log('[useMediaUrl] URL check result:', { jobId, isAvailable, url: mediaUrl });
      } else {
        console.log('[useMediaUrl] Skipping URL check for S3 URL:', { jobId, url: mediaUrl });
      }

      // Don't hide jobs based on URL check - let the browser try to load the image
      // The image onError handler will show an error state if it truly fails
      const result: MediaURL = {
        value: mediaUrl, // Always return the URL, let browser handle loading
        updatedAt: Date.now(),
        expiresAt: Date.now() + MEDIA_URL_TTL,
        projectId,
        jobId,
        type,
        refreshing: false,
        error: undefined // Clear any previous errors
      };

      mediaUrlCache.set(jobId, result);
      setUrl(result);
    } catch (error: any) {
      // Check if project/job has been deleted
      const errorMessage = error?.message || '';
      const isDeleted = errorMessage.includes('deleted') || 
                       errorMessage.includes('404') ||
                       error?.status === 404;
      
      if (isDeleted) {
        console.log(`[useMediaUrl] Project/job deleted, hiding job ${jobId}`);
        // Mark job as hidden and store in localStorage
        hiddenJobs.add(jobId);
        try {
          const stored = getHiddenJobsFromStorage();
          stored.add(jobId);
          localStorage.setItem('hiddenJobs', JSON.stringify(Array.from(stored)));
        } catch (e) {
          console.warn('[useMediaUrl] Failed to store hidden job in localStorage:', e);
        }
        
        // Call onHideJob callback if provided
        if (onHideJob) {
          onHideJob(projectId, jobId);
        }
        
        // Return null URL for deleted jobs
        const deletedResult: MediaURL = {
          value: null,
          updatedAt: Date.now(),
          expiresAt: Date.now() + MEDIA_URL_TTL,
          projectId,
          jobId,
          type,
          refreshing: false,
          error: 'Project or job has been deleted'
        };
        
        mediaUrlCache.set(jobId, deletedResult);
        setUrl(deletedResult);
        return;
      }
      
      // For other errors, log but don't hide the job
      console.error(`[useMediaUrl] Failed to fetch URL for ${jobId}:`, error);
      
      const errorResult: MediaURL = {
        value: null,
        updatedAt: Date.now(),
        expiresAt: Date.now() + MEDIA_URL_TTL,
        projectId,
        jobId,
        type,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Failed to fetch media URL'
      };

      mediaUrlCache.set(jobId, errorResult);
      setUrl(errorResult);
    }
  }, [projectId, jobId, type, sogniClient, enabled, onHideJob, isHidden]);

  // Fetch URL when enabled
  useEffect(() => {
    if (enabled && !isJobHidden) {
      refresh();
    }
  }, [enabled, isJobHidden, refresh]);

  return {
    url: url?.value || null,
    loading: url?.refreshing || false,
    error: url?.error,
    hidden: isJobHidden,
    refresh
  };
}

export default useMediaUrl;
