import React, { useEffect, useRef, useState } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { ONBOARDING_STEPS, type OnboardingStep } from '../../utils/onboardingSteps';
import './HelpOnboarding.css';

interface HelpOnboardingProps {
  /** Callback when onboarding is completed or skipped */
  onComplete?: () => void;
  /** Expose reset function via ref */
  onResetReady?: (reset: () => void) => void;
}

/**
 * HelpOnboarding - Interactive tutorial overlay
 */
const HelpOnboarding: React.FC<HelpOnboardingProps> = ({ onComplete, onResetReady }) => {
  const {
    isCompleted,
    isSkipped,
    currentStep,
    totalSteps,
    complete,
    skip,
    nextStep,
    previousStep,
    reset
  } = useOnboarding(ONBOARDING_STEPS.length);

  // Expose reset function to parent
  useEffect(() => {
    if (onResetReady) {
      onResetReady(reset);
    }
  }, [onResetReady, reset]);

  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStepData = ONBOARDING_STEPS[currentStep];

  // Find target element for current step
  useEffect(() => {
    if (isCompleted || isSkipped || !currentStepData?.targetSelector) {
      setTargetElement(null);
      return;
    }

    try {
      const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
      setTargetElement(element || null);
    } catch (error) {
      console.warn('[HelpOnboarding] Failed to find target element:', error);
      setTargetElement(null);
    }
  }, [currentStep, currentStepData, isCompleted, isSkipped]);

  // Don't render if completed or skipped
  if (isCompleted || isSkipped) {
    return null;
  }

  const handleSkip = () => {
    skip();
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      complete();
      onComplete?.();
    } else {
      nextStep();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  // Calculate overlay position based on target element
  const getOverlayStyle = (): React.CSSProperties => {
    if (!targetElement) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100000
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const position = currentStepData.position || 'bottom';

    let top = rect.bottom + 20;
    let left = rect.left + rect.width / 2;
    let transform = 'translateX(-50%)';

    switch (position) {
      case 'top':
        top = rect.top - 20;
        transform = 'translate(-50%, -100%)';
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - 20;
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + 20;
        transform = 'translateY(-50%)';
        break;
      case 'center':
        top = rect.top + rect.height / 2;
        left = rect.left + rect.width / 2;
        transform = 'translate(-50%, -50%)';
        break;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      transform,
      zIndex: 100000
    };
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="onboarding-backdrop"
        onClick={handleSkip}
      />

      {/* Highlight overlay for target element */}
      {targetElement && (
        <div
          className="onboarding-highlight"
          style={{
            position: 'fixed',
            top: `${targetElement.getBoundingClientRect().top}px`,
            left: `${targetElement.getBoundingClientRect().left}px`,
            width: `${targetElement.getBoundingClientRect().width}px`,
            height: `${targetElement.getBoundingClientRect().height}px`,
            zIndex: 99999
          }}
        />
      )}

      {/* Tooltip/Instruction box */}
      <div
        ref={overlayRef}
        className="onboarding-tooltip"
        style={getOverlayStyle()}
      >
        <div className="onboarding-header">
          <span className="onboarding-step-counter">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            className="onboarding-close"
            onClick={handleSkip}
            aria-label="Skip tutorial"
          >
            ×
          </button>
        </div>

        <div className="onboarding-content">
          <h3 className="onboarding-title">{currentStepData.title}</h3>
          <p className="onboarding-description">{currentStepData.description}</p>
        </div>

        <div className="onboarding-actions">
          {currentStep > 0 && (
            <button
              className="onboarding-btn onboarding-btn-secondary"
              onClick={handlePrevious}
            >
              Previous
            </button>
          )}
          <button
            className="onboarding-btn onboarding-btn-primary"
            onClick={handleNext}
          >
            {currentStep >= totalSteps - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
};

export default HelpOnboarding;
