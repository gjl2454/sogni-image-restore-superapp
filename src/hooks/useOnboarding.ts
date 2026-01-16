/**
 * useOnboarding Hook
 * Manages onboarding/tutorial state
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sogni_restoration_onboarding_completed';
const STORAGE_KEY_SKIPPED = 'sogni_restoration_onboarding_skipped';

interface UseOnboardingReturn {
  /** Whether onboarding has been completed */
  isCompleted: boolean;
  /** Whether onboarding has been skipped */
  isSkipped: boolean;
  /** Current step index */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Mark onboarding as completed */
  complete: () => void;
  /** Skip onboarding */
  skip: () => void;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  previousStep: () => void;
  /** Go to specific step */
  goToStep: (step: number) => void;
  /** Reset onboarding (for testing) */
  reset: () => void;
}

export function useOnboarding(totalSteps: number = 4): UseOnboardingReturn {
  const [isCompleted, setIsCompleted] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isSkipped, setIsSkipped] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SKIPPED) === 'true';
    } catch {
      return false;
    }
  });

  const [currentStep, setCurrentStep] = useState(0);

  const complete = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsCompleted(true);
    } catch (error) {
      console.warn('[useOnboarding] Failed to save completion:', error);
    }
  }, []);

  const skip = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SKIPPED, 'true');
      setIsSkipped(true);
    } catch (error) {
      console.warn('[useOnboarding] Failed to save skip:', error);
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= totalSteps - 1) {
        complete();
        return prev;
      }
      return prev + 1;
    });
  }, [totalSteps, complete]);

  const previousStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
  }, [totalSteps]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_SKIPPED);
      setIsCompleted(false);
      setIsSkipped(false);
      setCurrentStep(0);
    } catch (error) {
      console.warn('[useOnboarding] Failed to reset:', error);
    }
  }, []);

  return {
    isCompleted,
    isSkipped,
    currentStep,
    totalSteps,
    complete,
    skip,
    nextStep,
    previousStep,
    goToStep,
    reset
  };
}

export default useOnboarding;
