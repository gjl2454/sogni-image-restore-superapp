import { useState, useCallback, useEffect } from 'react';
import { SogniClient } from '@sogni-ai/sogni-client';
import { restorePhoto } from '../services/restorationService';
import { TokenType } from '../types/wallet';

// Individual restoration job state (photobooth pattern)
interface RestorationJob {
  id: string;
  index: number;
  generating: boolean;
  progress: number;
  resultUrl: string | null;
  error: string | null;
  etaSeconds?: number;
}

interface UseRestorationResult {
  isRestoring: boolean;
  progress: number;
  error: string | null;
  restoredUrls: string[];
  restorationJobs: RestorationJob[]; // Individual job states
  selectedUrl: string | null;
  selectedJobIndex: number | null;
  etaSeconds: number | undefined;
  completedCount: number;
  totalCount: number;
  restore: (client: SogniClient, imageData: Uint8Array, width: number, height: number, tokenType: TokenType, numberOfMedia?: number) => Promise<void>;
  selectResult: (url: string, jobIndex?: number) => void;
  clearSelection: () => void;
  reset: () => void;
}

export function useRestoration(): UseRestorationResult {
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [restoredUrls, setRestoredUrls] = useState<string[]>([]);
  const [restorationJobs, setRestorationJobs] = useState<RestorationJob[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedJobIndex, setSelectedJobIndex] = useState<number | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | undefined>(undefined);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const restore = useCallback(async (
    client: SogniClient,
    imageData: Uint8Array,
    width: number,
    height: number,
    tokenType: TokenType,
    numberOfMedia: number = 4
  ) => {
    console.log('[RESTORE HOOK] Starting restoration...', {
      hasClient: !!client,
      imageDataSize: imageData?.length,
      width,
      height,
      tokenType,
      numberOfMedia,
      // SDK has typo: isAuthenicated (missing 't')
      clientAuthenticated: (client?.account?.currentAccount as any)?.isAuthenicated,
      clientUsername: client?.account?.currentAccount?.username
    });

    setIsRestoring(true);
    setProgress(0);
    setError(null);
    setRestoredUrls([]);
    setSelectedUrl(null);
    setEtaSeconds(undefined);
    setCompletedCount(0);
    setTotalCount(numberOfMedia);

    // PHOTOBOOTH PATTERN: Create placeholder jobs upfront (like photobooth lines 8799-8821)
    const baseTimestamp = Date.now();
    const placeholderJobs: RestorationJob[] = [];
    for (let i = 0; i < numberOfMedia; i++) {
      placeholderJobs.push({
        id: `${baseTimestamp}-${i}`,
        index: i,
        generating: true,
        progress: 0,
        resultUrl: null,
        error: null
      });
    }
    setRestorationJobs(placeholderJobs);
    console.log('[RESTORE HOOK] Created placeholder jobs:', placeholderJobs.length);

    try {
      console.log('[RESTORE HOOK] Calling restorePhoto service...');
      const resultUrls = await restorePhoto(
        client,
        { imageData, width, height, tokenType, numberOfMedia },
        (progressUpdate) => {
          console.log('[RESTORE HOOK] Progress update:', progressUpdate);
          
          // Handle progress updates for individual jobs (photobooth pattern)
          if (progressUpdate.progress !== undefined && progressUpdate.jobIndex !== undefined) {
            setProgress(progressUpdate.progress);
            
            // Update specific job progress using jobIndex
            setRestorationJobs(prev => prev.map((job, idx) => 
              idx === progressUpdate.jobIndex
                ? { ...job, progress: progressUpdate.progress || 0, etaSeconds: progressUpdate.etaSeconds }
                : job
            ));
          }
          
          // Handle ETA updates
          if (progressUpdate.etaSeconds !== undefined) {
            setEtaSeconds(progressUpdate.etaSeconds);
          }
          
          // Handle individual job completions - CRITICAL: Update specific job using jobIndex
          if (progressUpdate.type === 'completed' && progressUpdate.resultUrl && progressUpdate.jobIndex !== undefined) {
            console.log('[RESTORE HOOK] Job completed!', {
              jobId: progressUpdate.jobId,
              jobIndex: progressUpdate.jobIndex,
              resultUrl: progressUpdate.resultUrl,
              completedCount: progressUpdate.completedCount
            });
            
            // Update the specific job that completed using jobIndex
            setRestorationJobs(prev => prev.map((job, idx) => 
              idx === progressUpdate.jobIndex
                ? { ...job, generating: false, progress: 1, resultUrl: progressUpdate.resultUrl! }
                : job
            ));
            
            // Also update restoredUrls array
            setRestoredUrls(prev => {
              if (prev.includes(progressUpdate.resultUrl!)) {
                return prev;
              }
              return [...prev, progressUpdate.resultUrl!];
            });
            
            setCompletedCount(progressUpdate.completedCount || 0);
          }
          
          // Update counts
          if (progressUpdate.completedCount !== undefined) {
            setCompletedCount(progressUpdate.completedCount);
          }
          if (progressUpdate.totalCount !== undefined) {
            setTotalCount(progressUpdate.totalCount);
          }
        }
      );

      console.log('[RESTORE HOOK] Restoration complete! Got URLs:', resultUrls);
      // Ensure all jobs are marked complete
      setRestorationJobs(prev => prev.map((job, idx) => ({
        ...job,
        generating: false,
        progress: 1,
        resultUrl: resultUrls[idx] || job.resultUrl
      })));
      setRestoredUrls(resultUrls);
      setProgress(1);
      setEtaSeconds(0);
    } catch (err: any) {
      console.error('[RESTORE HOOK] Restoration failed:', {
        error: err,
        message: err?.message,
        code: err?.code,
        stack: err?.stack
      });
      
      // Handle specific error types
      if (err.isInsufficientCredits || err.message === 'INSUFFICIENT_CREDITS') {
        setError('INSUFFICIENT_CREDITS');
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('timeout')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Restoration failed. Please try again.');
      }
      
      // Re-throw so callers know the operation failed
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const selectResult = useCallback((url: string, jobIndex?: number) => {
    console.log('[SELECT] Selecting URL:', url, 'with jobIndex:', jobIndex);
    setSelectedUrl(url);
    // If jobIndex is provided, use it directly (more reliable)
    if (jobIndex !== undefined) {
      console.log('[SELECT] Using provided jobIndex:', jobIndex);
      setSelectedJobIndex(jobIndex);
    } else {
      // Otherwise, find it from restorationJobs
      setRestorationJobs(currentJobs => {
        const job = currentJobs.find(j => j.resultUrl === url);
        if (job) {
          console.log('[SELECT] Found job index:', job.index, 'for URL');
          setSelectedJobIndex(job.index);
        } else {
          console.log('[SELECT] No job found for URL');
          setSelectedJobIndex(null);
        }
        return currentJobs;
      });
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedUrl(null);
    setSelectedJobIndex(null);
  }, []);

  const reset = useCallback(() => {
    setIsRestoring(false);
    setProgress(0);
    setError(null);
    setRestoredUrls([]);
    setRestorationJobs([]);
    setSelectedUrl(null);
    setSelectedJobIndex(null);
    setEtaSeconds(undefined);
    setCompletedCount(0);
    setTotalCount(0);
  }, []);

  return {
    isRestoring,
    progress,
    error,
    restoredUrls,
    restorationJobs,
    selectedUrl,
    selectedJobIndex,
    etaSeconds,
    completedCount,
    totalCount,
    restore,
    selectResult,
    clearSelection,
    reset
  };
}

