import { useState, useCallback } from 'react';
import { SogniClient } from '@sogni-ai/sogni-client';
import { restorePhoto } from '../services/restorationService';
import { TokenType } from '../types/wallet';

interface UseRestorationResult {
  isRestoring: boolean;
  progress: number;
  error: string | null;
  restoredUrls: string[];
  selectedUrl: string | null;
  restore: (client: SogniClient, imageData: Uint8Array, width: number, height: number, tokenType: TokenType) => Promise<void>;
  selectResult: (url: string) => void;
  clearSelection: () => void;
  reset: () => void;
}

export function useRestoration(): UseRestorationResult {
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [restoredUrls, setRestoredUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  const restore = useCallback(async (
    client: SogniClient,
    imageData: Uint8Array,
    width: number,
    height: number,
    tokenType: TokenType
  ) => {
    setIsRestoring(true);
    setProgress(0);
    setError(null);
    setRestoredUrls([]);
    setSelectedUrl(null);

    try {
      const resultUrls = await restorePhoto(
        client,
        { imageData, width, height, tokenType },
        (progressUpdate) => {
          if (progressUpdate.progress !== undefined) {
            setProgress(progressUpdate.progress);
          }
        }
      );

      setRestoredUrls(resultUrls);
      setProgress(1);
    } catch (err: any) {
      console.error('[RESTORE] Restoration failed:', err);
      
      // Handle specific error types
      if (err.isInsufficientCredits || err.message === 'INSUFFICIENT_CREDITS') {
        setError('INSUFFICIENT_CREDITS');
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('timeout')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Restoration failed. Please try again.');
      }
    } finally {
      setIsRestoring(false);
    }
  }, []);

  const selectResult = useCallback((url: string) => {
    setSelectedUrl(url);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedUrl(null);
  }, []);

  const reset = useCallback(() => {
    setIsRestoring(false);
    setProgress(0);
    setError(null);
    setRestoredUrls([]);
    setSelectedUrl(null);
  }, []);

  return {
    isRestoring,
    progress,
    error,
    restoredUrls,
    selectedUrl,
    restore,
    selectResult,
    clearSelection,
    reset
  };
}

