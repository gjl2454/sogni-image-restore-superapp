/**
 * useCredits Hook
 * Tracks credit usage and provides credit-related utilities
 */

import { useState, useCallback, useEffect } from 'react';
import { estimateRestorationCost, estimateVideoCost } from '../services/creditsService';

interface CreditUsage {
  restoration: number;
  video: number;
  total: number;
}

interface UseCreditsReturn {
  /** Estimated cost for current restoration operation */
  estimatedRestorationCost: number;
  /** Estimated cost for video generation */
  estimatedVideoCost: number;
  /** Usage history for this session */
  sessionUsage: CreditUsage;
  /** Track a restoration operation */
  trackRestoration: (numberOfImages: number) => void;
  /** Track a video generation */
  trackVideo: () => void;
  /** Reset session usage */
  resetSession: () => void;
}

const STORAGE_KEY = 'sogni_restoration_credits_usage';

/**
 * Load usage history from localStorage
 */
function loadUsageHistory(): CreditUsage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[useCredits] Failed to load usage history:', error);
  }
  return { restoration: 0, video: 0, total: 0 };
}

/**
 * Save usage history to localStorage
 */
function saveUsageHistory(usage: CreditUsage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch (error) {
    console.warn('[useCredits] Failed to save usage history:', error);
  }
}

export function useCredits(numberOfImages: number = 4): UseCreditsReturn {
  const [sessionUsage, setSessionUsage] = useState<CreditUsage>(loadUsageHistory);

  // Calculate estimated costs
  const estimatedRestorationCost = estimateRestorationCost(numberOfImages);
  const estimatedVideoCost = estimateVideoCost();

  // Track restoration usage
  const trackRestoration = useCallback((numberOfImages: number) => {
    const cost = estimateRestorationCost(numberOfImages);
    setSessionUsage(prev => {
      const updated = {
        restoration: prev.restoration + cost,
        video: prev.video,
        total: prev.total + cost
      };
      saveUsageHistory(updated);
      return updated;
    });
  }, []);

  // Track video usage
  const trackVideo = useCallback(() => {
    const cost = estimateVideoCost();
    setSessionUsage(prev => {
      const updated = {
        restoration: prev.restoration,
        video: prev.video + cost,
        total: prev.total + cost
      };
      saveUsageHistory(updated);
      return updated;
    });
  }, []);

  // Reset session usage
  const resetSession = useCallback(() => {
    const reset = { restoration: 0, video: 0, total: 0 };
    setSessionUsage(reset);
    saveUsageHistory(reset);
  }, []);

  return {
    estimatedRestorationCost,
    estimatedVideoCost,
    sessionUsage,
    trackRestoration,
    trackVideo,
    resetSession
  };
}

export default useCredits;
