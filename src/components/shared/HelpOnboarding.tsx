import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { ONBOARDING_STEPS } from '../../utils/onboardingSteps';
import './HelpOnboarding.css';

interface HelpOnboardingProps {
  onComplete?: () => void;
  onResetReady?: (reset: () => void) => void;
}

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * HelpOnboarding - Interactive tutorial overlay with spotlight effect
 *
 * Design principles:
 * - Spotlight effect: Only the highlighted area is clearly visible
 * - No backdrop blur: Content under spotlight is crisp and clear
 * - Simple positioning: Tooltip positioned relative to highlight
 * - Responsive: Works on desktop, tablet, and mobile
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

  const [highlightPosition, setHighlightPosition] = useState<Position | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = ONBOARDING_STEPS[currentStep];

  // Expose reset function to parent
  useEffect(() => {
    if (onResetReady) {
      onResetReady(reset);
    }
  }, [onResetReady, reset]);

  // Calculate highlight position for current step
  const calculateHighlightPosition = useCallback((): Position | null => {
    if (!currentStepData?.targetSelector) return null;

    const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    // Padding around the highlighted element
    const padding = currentStepData.id === 'upload' ? 16 : 12;

    return {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    };
  }, [currentStepData]);

  // Calculate tooltip position based on highlight and viewport
  const calculateTooltipPosition = useCallback((highlight: Position | null): React.CSSProperties => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    const padding = 16;
    const gap = 20; // Gap between highlight and tooltip

    // Get tooltip dimensions (estimate if not rendered yet)
    const tooltipWidth = tooltipRef.current?.offsetWidth || 380;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 250;

    // For steps without a target element (steps 3 & 4), center the tooltip
    if (!highlight || currentStepData?.id === 'restore' || currentStepData?.id === 'results') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const highlightCenter = {
      x: highlight.left + highlight.width / 2,
      y: highlight.top + highlight.height / 2
    };

    // Determine best position: prefer below, then above, then sides
    let top: number;
    let left: number;

    // Space available in each direction
    const spaceBelow = viewport.height - (highlight.top + highlight.height) - gap;
    const spaceAbove = highlight.top - gap;
    const spaceRight = viewport.width - (highlight.left + highlight.width) - gap;
    const spaceLeft = highlight.left - gap;

    // Try below first (most natural reading flow)
    if (spaceBelow >= tooltipHeight + padding) {
      top = highlight.top + highlight.height + gap;
      left = Math.max(padding, Math.min(highlightCenter.x - tooltipWidth / 2, viewport.width - tooltipWidth - padding));
    }
    // Try above
    else if (spaceAbove >= tooltipHeight + padding) {
      top = highlight.top - gap - tooltipHeight;
      left = Math.max(padding, Math.min(highlightCenter.x - tooltipWidth / 2, viewport.width - tooltipWidth - padding));
    }
    // Try right
    else if (spaceRight >= tooltipWidth + padding) {
      top = Math.max(padding, Math.min(highlightCenter.y - tooltipHeight / 2, viewport.height - tooltipHeight - padding));
      left = highlight.left + highlight.width + gap;
    }
    // Try left
    else if (spaceLeft >= tooltipWidth + padding) {
      top = Math.max(padding, Math.min(highlightCenter.y - tooltipHeight / 2, viewport.height - tooltipHeight - padding));
      left = highlight.left - gap - tooltipWidth;
    }
    // Fallback: position below and let it scroll if needed
    else {
      top = Math.min(highlight.top + highlight.height + gap, viewport.height - tooltipHeight - padding);
      left = Math.max(padding, Math.min(highlightCenter.x - tooltipWidth / 2, viewport.width - tooltipWidth - padding));
    }

    // Ensure tooltip stays within viewport
    top = Math.max(padding, Math.min(top, viewport.height - tooltipHeight - padding));
    left = Math.max(padding, Math.min(left, viewport.width - tooltipWidth - padding));

    return {
      top: `${top}px`,
      left: `${left}px`
    };
  }, [currentStepData]);

  // Update positions when step changes or window resizes
  useEffect(() => {
    if (isCompleted || isSkipped) {
      setIsVisible(false);
      return;
    }

    const updatePositions = () => {
      const highlight = calculateHighlightPosition();
      setHighlightPosition(highlight);
      setTooltipPosition(calculateTooltipPosition(highlight));
    };

    // Initial delay to let DOM settle
    const showTimeout = setTimeout(() => {
      updatePositions();
      setIsVisible(true);
    }, 100);

    // Update on resize
    const handleResize = () => {
      requestAnimationFrame(updatePositions);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    // Also observe body for layout changes
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(document.body);

    return () => {
      clearTimeout(showTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      resizeObserver.disconnect();
    };
  }, [currentStep, isCompleted, isSkipped, calculateHighlightPosition, calculateTooltipPosition]);

  // Recalculate tooltip position after it renders (to get accurate dimensions)
  useEffect(() => {
    if (!isVisible || !tooltipRef.current) return;

    const highlight = calculateHighlightPosition();
    setTooltipPosition(calculateTooltipPosition(highlight));
  }, [isVisible, calculateHighlightPosition, calculateTooltipPosition]);

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
      setIsVisible(false); // Hide during transition
      setTimeout(() => nextStep(), 50);
    }
  };

  const handlePrevious = () => {
    setIsVisible(false); // Hide during transition
    setTimeout(() => previousStep(), 50);
  };

  // Handle click on backdrop (outside highlight and tooltip)
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop area
    if (e.target === e.currentTarget) {
      handleSkip();
    }
  };

  const showHighlight = isVisible && highlightPosition &&
    currentStepData?.id !== 'restore' && currentStepData?.id !== 'results';

  return (
    <>
      {/* Spotlight highlight - creates the dimming effect via box-shadow */}
      {showHighlight && (
        <div
          className="onboarding-highlight"
          style={{
            top: `${highlightPosition.top}px`,
            left: `${highlightPosition.left}px`,
            width: `${highlightPosition.width}px`,
            height: `${highlightPosition.height}px`,
            opacity: isVisible ? 1 : 0
          }}
          onClick={handleBackdropClick}
        />
      )}

      {/* Fallback backdrop for steps without highlight (steps 3 & 4) */}
      {isVisible && !showHighlight && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99999
          }}
          onClick={handleBackdropClick}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="onboarding-tooltip"
        style={{
          ...tooltipPosition,
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none'
        }}
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
            &times;
          </button>
        </div>

        <div className="onboarding-content">
          <h3 className="onboarding-title">{currentStepData?.title}</h3>
          <p className="onboarding-description">{currentStepData?.description}</p>
        </div>

        {/* Progress dots */}
        <div className="onboarding-progress">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`onboarding-dot ${
                index === currentStep ? 'active' : index < currentStep ? 'completed' : ''
              }`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          {currentStep > 0 && (
            <button
              className="onboarding-btn onboarding-btn-secondary"
              onClick={handlePrevious}
            >
              Back
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
