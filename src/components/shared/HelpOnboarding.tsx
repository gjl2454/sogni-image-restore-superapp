import React, { useEffect, useRef, useState } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { ONBOARDING_STEPS } from '../../utils/onboardingSteps';
import './HelpOnboarding.css';

// No caching - always recalculate positions for consistency

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
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStepData = ONBOARDING_STEPS[currentStep];

  // Calculate overlay position based on target element
  const getOverlayStyle = (): React.CSSProperties => {
    // IMPORTANT: Always get current viewport dimensions - don't cache them
    // This ensures we use the latest viewport size during resize
    const padding = 20;
    const safePadding = padding + 5; // Extra safety margin to prevent cutoff
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight; // Always get current height
    // Use responsive dimensions for tooltip based on viewport
    // Cap at 400px but reduce on smaller screens to prevent overlap
    // For step 2 (upload), use even narrower width to fit on sides
    // For steps 3 and 4 (restore, results), use larger centered width
    const stepId = currentStepData?.id;
    const isStep2 = stepId === 'upload';
    const isStep3or4 = stepId === 'restore' || stepId === 'results';
    const maxTooltipWidth = isStep2
      ? Math.min(280, viewportWidth - 40) // Narrower for step 2 to fit on sides
      : isStep3or4
        ? Math.min(500, viewportWidth - 80) // Larger for steps 3-4, centered
        : Math.min(400, viewportWidth - 40); // Responsive width
    // Use responsive max height
    const maxTooltipHeight = Math.min(400, viewportHeight - 100); // Responsive height

    // For steps 3 and 4, center within upload box (doesn't need targetElement)
    if (isStep3or4) {
      const uploadZone = document.querySelector('[data-onboarding="upload-zone"]');
      if (uploadZone) {
        const uploadRect = uploadZone.getBoundingClientRect();
        console.log('[Steps 3-4] Upload zone rect:', uploadRect);

        // Calculate exact center position within the upload box
        // Move up slightly from mathematical center for better visual centering
        const top = uploadRect.top + (uploadRect.height / 2) - 1;
        const left = uploadRect.left + (uploadRect.width / 2);

        console.log('[Steps 3-4] Calculated center position:', { top, left });

        return {
          position: 'fixed' as const,
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 100002,
          maxWidth: `${maxTooltipWidth}px`,
          maxHeight: `${maxTooltipHeight}px`,
          width: 'auto'
        };
      } else {
        // Fallback to screen center if upload zone not found
        console.log('[Steps 3-4] Upload zone not found, using screen center');
        const top = viewportHeight / 2 - 1;
        const left = viewportWidth / 2;

        return {
          position: 'fixed' as const,
          top: `${top}px`,
          left: `${left}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 100002,
          maxWidth: `${maxTooltipWidth}px`,
          maxHeight: `${maxTooltipHeight}px`,
          width: 'auto'
        };
      }
    }

    if (!targetElement) {
      // Center the tooltip if no target element
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100002, // Higher than both backdrop (99998) and highlight (100001)
        maxWidth: `${maxTooltipWidth}px`,
        maxHeight: `${maxTooltipHeight}px`,
        width: 'auto'
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const position = currentStepData.position || 'bottom';
    
    // Use actual tooltip dimensions if available, otherwise use fixed estimates
    // Tooltip size should remain constant - only position changes
    const tooltipWidth = overlayRef.current 
      ? overlayRef.current.offsetWidth || overlayRef.current.scrollWidth
      : 400; // Fixed width estimate
    const tooltipHeight = overlayRef.current 
      ? Math.max(overlayRef.current.offsetHeight || 0, overlayRef.current.scrollHeight || 0)
      : 350; // Fixed height estimate

    // Add extra spacing to avoid overlapping with highlighted element
    const spacing = 30;
    
    let top = rect.bottom + spacing;
    let left = rect.left + rect.width / 2;
    let transform = 'translateX(-50%)';

    // Step-specific positioning - ALWAYS use consistent positioning for each step
    if (stepId === 'number-of-images') {
      // Step 1: Position right below the highlighted batch number buttons
      // Use reduced spacing to move text box up and prevent bottom cutoff
      const extraSpacing = 5; // Reduced to 5px to move text box very close
      top = rect.bottom + extraSpacing;
      left = rect.left + rect.width / 2;
      transform = 'translateX(-50%)'; // ALWAYS below - never change this

      // Only adjust the exact top position to fit within viewport, but ALWAYS keep it below
      // Never change transform to 'translate(-50%, -100%)' for step 1
      const tooltipBottom = top + tooltipHeight;
      // Add extra padding at bottom to prevent cutoff
      const bottomPadding = 50; // Increased from 30 to 50 to ensure full visibility
      if (tooltipBottom > viewportHeight - padding - bottomPadding) {
        // Adjust top to fit, but keep it below the element with minimum spacing
        top = Math.max(rect.bottom + 5, viewportHeight - padding - tooltipHeight - bottomPadding);
        // Ensure we maintain minimum spacing from the element
        if (top < rect.bottom + 5) {
          top = rect.bottom + 5; // Minimum spacing to avoid overlap
        }
      }
      // Final check: ensure we're not overlapping with the element
      // Always maintain minimum spacing to prevent covering
      if (top < rect.bottom + 5) {
        top = rect.bottom + 5; // Ensure proper spacing to avoid covering
      }

      // Always recalculate to ensure consistency (no caching)
      return {
        position: 'fixed' as const,
        top: `${top}px`,
        left: `${left}px`,
        transform,
        zIndex: 100002,
        maxWidth: `${maxTooltipWidth}px`,
        maxHeight: `${maxTooltipHeight}px`,
        width: 'auto'
      };
    } else if (stepId === 'upload') {
      // Step 2: Position on the left or right side of the upload box (no caching)
      const spaceOnLeft = rect.left - padding;
      const spaceOnRight = viewportWidth - rect.right - padding;
      const requiredSpace = tooltipWidth; // Just the tooltip width, no buffer - overlap detection will handle spacing

      // Try left first, then right, if neither has full space use the side with more space
      if (spaceOnLeft >= requiredSpace) {
        // Enough space on left - position to the left
        top = rect.top + rect.height / 2;
        left = rect.left - spacing;
        transform = 'translate(-100%, -50%)';
      } else if (spaceOnRight >= requiredSpace) {
        // Not enough space on left but enough on right - position to the right
        top = rect.top + rect.height / 2;
        left = rect.right + spacing;
        transform = 'translateY(-50%)';
      } else if (spaceOnLeft > spaceOnRight) {
        // Neither side has full space, but left has more - position on left and let bounds checking fit it
        top = rect.top + rect.height / 2;
        left = rect.left - spacing;
        transform = 'translate(-100%, -50%)';
      } else {
        // Right has more space - position on right and let bounds checking fit it
        top = rect.top + rect.height / 2;
        left = rect.right + spacing;
        transform = 'translateY(-50%)';
      }
    } else {
      // Other steps: Use the configured position
      switch (position) {
        case 'top':
          top = rect.top - spacing;
          transform = 'translate(-50%, -100%)';
          // Check if tooltip would go off top
          const tooltipTopEdge = top - tooltipHeight;
          if (tooltipTopEdge < padding) {
            // Not enough space above, position below instead
            top = rect.bottom + spacing;
            transform = 'translateX(-50%)';
            // Ensure it doesn't go off bottom either
            const tooltipBottomEdge = top + tooltipHeight;
            if (tooltipBottomEdge > viewportHeight - padding) {
              // Adjust to fit within viewport
              top = viewportHeight - padding - tooltipHeight;
              // Make sure it doesn't overlap with element
              if (top < rect.bottom + spacing) {
                top = rect.bottom + spacing;
              }
            }
          }
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - spacing;
          transform = 'translate(-100%, -50%)';
          // If tooltip would go off left, position right instead
          if (left - tooltipWidth < padding) {
            left = rect.right + spacing;
            transform = 'translateY(-50%)';
          }
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + spacing;
          transform = 'translateY(-50%)';
          // If tooltip would go off right, position left instead
          if (left + tooltipWidth > viewportWidth - padding) {
            left = rect.left - spacing;
            transform = 'translate(-100%, -50%)';
          }
          break;
        case 'center':
          // For center, position to the side to avoid overlap
          if (rect.right + spacing + tooltipWidth <= viewportWidth - padding) {
            top = rect.top + rect.height / 2;
            left = rect.right + spacing;
            transform = 'translateY(-50%)';
          } else if (rect.left - spacing - tooltipWidth >= padding) {
            top = rect.top + rect.height / 2;
            left = rect.left - spacing;
            transform = 'translate(-100%, -50%)';
          } else {
            top = rect.bottom + spacing;
            left = rect.left + rect.width / 2;
            transform = 'translateX(-50%)';
          }
          break;
        default: // 'bottom'
          top = rect.bottom + spacing;
          transform = 'translateX(-50%)';
          // If tooltip would go off bottom, position above instead
          if (top + tooltipHeight > viewportHeight - padding) {
            top = rect.top - spacing;
            transform = 'translate(-50%, -100%)';
          }
      }
    }
    
    // Check if tooltip would overlap with target element and adjust
    // ALWAYS check for step 1 to prevent covering the highlighted element
    const tooltipRect = {
      top: transform.includes('translateY(-50%)') || transform.includes('translate(-50%, -50%)') 
        ? top - tooltipHeight / 2 
        : transform.includes('translate(-50%, -100%)') || transform.includes('translate(-100%, -50%)')
          ? top - tooltipHeight
          : top,
      bottom: transform.includes('translateY(-50%)') || transform.includes('translate(-50%, -50%)')
        ? top + tooltipHeight / 2
        : transform.includes('translate(-50%, -100%)') || transform.includes('translate(-100%, -50%)')
          ? top
          : top + tooltipHeight,
      left: transform.includes('translateX(-50%)') || transform.includes('translate(-50%')
        ? left - tooltipWidth / 2
        : transform.includes('translate(-100%')
          ? left - tooltipWidth
          : left,
      right: transform.includes('translateX(-50%)') || transform.includes('translate(-50%')
        ? left + tooltipWidth / 2
        : transform.includes('translate(-100%')
          ? left
          : left + tooltipWidth
    };
    
    // For step 1, ALWAYS enforce minimum spacing to prevent covering highlighted element
    if (stepId === 'number-of-images') {
      // Calculate current spacing
      const currentSpacing = top - rect.bottom;
      // Enforce minimum spacing to place tooltip right below highlighted element
      const minSpacing = 25; // Increased to prevent overlap
      if (currentSpacing < minSpacing) {
        top = rect.bottom + minSpacing;
        transform = 'translateX(-50%)'; // Always keep it below
      }
      // Recalculate tooltipRect after spacing adjustment
      const updatedTooltipRect = {
        top: top,
        bottom: top + tooltipHeight,
        left: left - tooltipWidth / 2,
        right: left + tooltipWidth / 2
      };
      // Check for actual overlap with small buffer
      const buffer = 10; // Small buffer to ensure no overlap
      const overlapTop = Math.max(0, (rect.top - buffer) - updatedTooltipRect.bottom);
      const overlapBottom = Math.max(0, updatedTooltipRect.top - (rect.bottom + buffer));
      const overlapLeft = Math.max(0, (rect.left - buffer) - updatedTooltipRect.right);
      const overlapRight = Math.max(0, updatedTooltipRect.left - (rect.right + buffer));
      
      // If there's ANY overlap, add extra spacing
      if (overlapTop > 0 || overlapBottom > 0 || overlapLeft > 0 || overlapRight > 0) {
        const overlapAmount = Math.max(overlapTop, overlapBottom, overlapLeft, overlapRight);
        const requiredSpacing = minSpacing + overlapAmount + 10; // Add small buffer
        top = rect.bottom + requiredSpacing;
        transform = 'translateX(-50%)'; // Always keep it below
      }
      // Ensure tooltip doesn't go off screen, but still try to keep it below
      if (top + tooltipHeight > viewportHeight - padding) {
        // Adjust to fit but keep below with minimum spacing
        top = Math.max(rect.bottom + minSpacing, viewportHeight - padding - tooltipHeight);
        // Final safety check: ensure we maintain minimum spacing
        if (top < rect.bottom + 30) {
          top = rect.bottom + 30; // Minimum spacing to avoid covering
        }
      }
    } else {
      // For other steps, check for overlap normally
      const buffer = 30; // Standard buffer for other steps
      const overlapTop = Math.max(0, (rect.top - buffer) - tooltipRect.bottom);
      const overlapBottom = Math.max(0, tooltipRect.top - (rect.bottom + buffer));
      const overlapLeft = Math.max(0, (rect.left - buffer) - tooltipRect.right);
      const overlapRight = Math.max(0, tooltipRect.left - (rect.right + buffer));
      
      // If there's ANY overlap, adjust position to move tooltip further away
      if (overlapTop > 0 || overlapBottom > 0 || overlapLeft > 0 || overlapRight > 0) {
        if (stepId === 'upload') {
          // Step 2: ALWAYS keep on left side, just adjust spacing if overlapping
          const minSideSpacing = 30; // Minimum gap between tooltip and element
          
          // Calculate tooltip's right edge position when positioned to the left
          // The tooltip uses transform: translate(-100%, -50%), so its right edge is at 'left'
          // We want: tooltip right edge < element left edge - minSideSpacing
          left = rect.left - minSideSpacing - tooltipWidth;
          top = rect.top + rect.height / 2;
          transform = 'translate(-100%, -50%)';
          
          // If tooltip would go off the left edge, position it at the left edge
          // But ensure it still doesn't overlap with the element
          if (left < padding) {
            left = padding;
            // Double-check: if tooltip would still overlap, position below instead
            if (left + tooltipWidth > rect.left - minSideSpacing) {
              top = rect.bottom + 30;
              left = rect.left + rect.width / 2;
              transform = 'translateX(-50%)';
            }
          } else {
            // Verify no overlap
            const tooltipRightEdge = left;
            if (tooltipRightEdge > rect.left - minSideSpacing) {
              left = rect.left - minSideSpacing - tooltipWidth;
              if (left < padding) {
                top = rect.bottom + 30;
                left = rect.left + rect.width / 2;
                transform = 'translateX(-50%)';
              }
            }
          }
        } else {
          // Other steps: Generic adjustment
          if (!position) {
            top = rect.bottom + spacing + Math.max(overlapTop, overlapBottom) + buffer;
          } else if (position === 'top') {
            top = rect.top - spacing - tooltipHeight - Math.max(overlapTop, overlapBottom) - buffer;
          } else if (position === 'right' || transform.includes('translateY(-50%)')) {
            left = rect.right + spacing + Math.max(overlapLeft, overlapRight) + buffer;
          } else if (position === 'left' || transform.includes('translate(-100%')) {
            left = rect.left - spacing - tooltipWidth - Math.max(overlapLeft, overlapRight) - buffer;
          }
        }
      }
    }

    // Ensure tooltip stays within viewport horizontally
    // For step 2, preserve left positioning
    const isCenteredX = transform.includes('translateX(-50%)') || transform.includes('translate(-50%');
    const tooltipLeft = isCenteredX ? left - tooltipWidth / 2 : (transform.includes('translate(-100%') ? left - tooltipWidth : left);
    const tooltipRight = tooltipLeft + tooltipWidth;
    
    if (stepId === 'upload' && transform.includes('translate(-100%, -50%)')) {
      // Step 2: Positioned on left - ensure no overlap and stays in viewport
      // With translate(-100%, -50%), the tooltip extends to the left of the 'left' position
      const minGap = 30;
      const tooltipActualLeft = left - tooltipWidth;

      // Check if tooltip goes off left edge
      if (tooltipActualLeft < padding) {
        // Not enough space on left - fallback to positioning below
        top = rect.bottom + 30;
        left = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      } else {
        // Ensure there's a gap between tooltip and element
        const tooltipRightEdge = left; // Right edge of tooltip is at 'left' position
        if (tooltipRightEdge > rect.left - minGap) {
          // Too close - move further left
          left = rect.left - minGap;
          // Check again if it goes off screen
          if (left - tooltipWidth < padding) {
            // Still not enough space - fallback to below
            top = rect.bottom + 30;
            left = rect.left + rect.width / 2;
            transform = 'translateX(-50%)';
          }
        }
      }
    } else {
      // For other steps, allow normal horizontal adjustment
      if (tooltipLeft < padding) {
        left = padding + tooltipWidth / 2;
        transform = isCenteredX ? transform : 'translateX(-50%)';
      } else if (tooltipRight > viewportWidth - padding) {
        left = viewportWidth - padding - tooltipWidth / 2;
        transform = isCenteredX ? transform : 'translateX(-50%)';
      }
    }

    // Ensure tooltip stays within viewport vertically
    // For step 1, ALWAYS preserve the "below" positioning - never change it
    const isCenteredY = transform.includes('translateY(-50%)') || transform.includes('translate(-50%, -50%)');
    const isAbove = transform.includes('translate(-50%, -100%)') || transform.includes('translate(-100%, -50%)');
    const tooltipTop = isCenteredY 
      ? top - tooltipHeight / 2 
      : isAbove 
        ? top - tooltipHeight 
        : top;
    const tooltipBottom = tooltipTop + tooltipHeight;
    
    // For step 1, never change from "below" to "above" - just adjust position
    if (stepId === 'number-of-images' && transform === 'translateX(-50%)') {
      // Keep it below, just adjust to fit within viewport
      // Always maintain minimum spacing of 12px to place tooltip right below highlighted element
      // Add extra padding at bottom to prevent cutoff
      const bottomPadding = 50; // Increased to prevent text cutoff
      if (tooltipBottom > viewportHeight - padding - bottomPadding) {
        // Adjust top to fit, but keep it below the element with minimum spacing
        top = Math.max(rect.bottom + 30, viewportHeight - padding - tooltipHeight - bottomPadding);
      }
      // Final check: ensure minimum spacing is maintained
      if (top < rect.bottom + 30) {
        top = rect.bottom + 30; // Ensure proper spacing - right below the element
      }
      // Don't change transform - always keep it as 'translateX(-50%)' (below)
    } else {
      // For other steps, allow repositioning
      if (tooltipTop < padding) {
        // Not enough space above, position below
        top = rect.bottom + 20;
        transform = 'translateX(-50%)';
      } else if (tooltipBottom > viewportHeight - padding) {
        // Not enough space below, position above
        top = rect.top - 20;
        transform = 'translate(-50%, -100%)';
        // If still doesn't fit, center it vertically
        if (top - tooltipHeight < padding) {
          top = viewportHeight / 2;
          transform = 'translate(-50%, -50%)';
        }
      }
    }

    // Final bounds check - recalculate after transform adjustments
    const finalIsCenteredY = transform.includes('translateY(-50%)') || transform.includes('translate(-50%, -50%)');
    const finalIsAbove = transform.includes('translate(-50%, -100%)') || transform.includes('translate(-100%, -50%)');
    
    // Calculate actual tooltip bounds
    let finalTop = top;

    // Ensure tooltip fits vertically - CRITICAL: Always keep entire tooltip visible
    // For step 1, NEVER move it above - always keep it below with small spacing
    if (stepId === 'number-of-images') {
      // Step 1: Always keep below, never move above
      // Ensure minimum spacing of 20px from the element (right below it)
      // Use extra bottom padding to prevent cutoff
      const step1BottomPadding = 50; // Extra padding at bottom for step 1

      // Recalculate actual bounds with current finalTop
      const recalculatedTop = finalIsCenteredY
        ? finalTop - tooltipHeight / 2
        : finalIsAbove
          ? finalTop - tooltipHeight
          : finalTop;
      const recalculatedBottom = recalculatedTop + tooltipHeight;

      if (recalculatedTop < padding) {
        // If tooltip is too high, move it down but keep it below the element
        finalTop = rect.bottom + 5;
        transform = 'translateX(-50%)';
      } else if (recalculatedBottom > viewportHeight - step1BottomPadding) {
        // If tooltip goes off bottom, adjust to ensure it's fully visible
        // Calculate the maximum top position that keeps the entire tooltip visible
        const maxTop = viewportHeight - step1BottomPadding - tooltipHeight;
        // But don't go above the element (keep minimum spacing)
        finalTop = Math.max(rect.bottom + 5, Math.min(finalTop, maxTop));
        transform = 'translateX(-50%)';
        // Final safety check - ensure tooltip is fully within viewport
        const finalRecalculatedTop = finalTop;
        const finalRecalculatedBottom = finalRecalculatedTop + tooltipHeight;
        if (finalRecalculatedBottom > viewportHeight - step1BottomPadding) {
          finalTop = viewportHeight - step1BottomPadding - tooltipHeight;
        }
        if (finalRecalculatedTop < padding) {
          finalTop = padding;
        }
      } else {
        // Ensure we maintain minimum spacing
        if (finalTop < rect.bottom + 5) {
          finalTop = rect.bottom + 5;
        }
      }
    } else {
      // For other steps, allow normal repositioning but ensure full visibility
      const recalculatedTop = finalIsCenteredY 
        ? finalTop - tooltipHeight / 2 
        : finalIsAbove 
          ? finalTop - tooltipHeight 
          : finalTop;
      const recalculatedBottom = recalculatedTop + tooltipHeight;
      
      if (recalculatedTop < padding) {
        if (finalIsCenteredY) {
          finalTop = padding + tooltipHeight / 2;
        } else if (finalIsAbove) {
          // Move to below instead
          finalTop = rect.bottom + 20;
          transform = 'translateX(-50%)';
        } else {
          finalTop = padding;
        }
      } else if (recalculatedBottom > viewportHeight - padding) {
        if (finalIsCenteredY) {
          finalTop = viewportHeight - padding - tooltipHeight / 2;
        } else if (finalIsAbove) {
          finalTop = viewportHeight - padding - tooltipHeight;
        } else {
          // Move to above instead
          finalTop = rect.top - 20;
          transform = 'translate(-50%, -100%)';
          // If still doesn't fit, center it
          const centeredTop = finalTop - tooltipHeight;
          if (centeredTop < padding) {
            finalTop = viewportHeight / 2;
            transform = 'translate(-50%, -50%)';
          }
        }
      }
    }

    // Get actual tooltip dimensions from DOM if available - declare early for use below
    const actualTooltipWidth = overlayRef.current
      ? overlayRef.current.offsetWidth || tooltipWidth
      : tooltipWidth;

    const finalIsCenteredX = transform.includes('translateX(-50%)') || transform.includes('translate(-50%');
    let finalLeft = left; // Initialize with the calculated left position

    // For step 2, preserve left positioning and ensure no overlap
    if (stepId === 'upload' && transform.includes('translate(-100%, -50%)')) {
      // Step 2: Positioned on left - ensure proper spacing and viewport bounds
      const minGap = 30;
      const tooltipActualLeft = finalLeft - actualTooltipWidth;
      const tooltipRightEdge = finalLeft;

      // Ensure tooltip doesn't go off left edge
      if (tooltipActualLeft < padding) {
        // Adjust to fit within viewport
        finalLeft = padding + actualTooltipWidth;
      }

      // Ensure there's a gap between tooltip and element
      if (tooltipRightEdge > rect.left - minGap) {
        // Too close - move further left
        finalLeft = rect.left - minGap;

        // Check if this pushes it off the left edge
        if (finalLeft - actualTooltipWidth < padding) {
          // Not enough space on left - this will be handled by switching to below
          // Mark that we need to reposition
          finalLeft = rect.left + rect.width / 2;
        }
      }
    } else {
      // For other steps, allow normal horizontal adjustment
      finalLeft = finalIsCenteredX
        ? Math.max(padding + tooltipWidth / 2, Math.min(left, viewportWidth - padding - tooltipWidth / 2))
        : Math.max(padding, Math.min(left, viewportWidth - padding));
    }

    // Final bounds check - ensure tooltip is fully within viewport
    // Use actual rendered height from DOM if available
    // Use scrollHeight to get the full content height including buttons, not just visible height
    let actualRenderedHeight = tooltipHeight;
    if (overlayRef.current) {
      // scrollHeight gives us the full content height including any overflow
      // offsetHeight gives us the visible height (may be constrained by maxHeight)
      // We want to use the larger one to ensure we account for all content
      const scrollHeight = overlayRef.current.scrollHeight || 0;
      const offsetHeight = overlayRef.current.offsetHeight || 0;
      
      // Use the larger of the two to ensure we include all content
      actualRenderedHeight = Math.max(scrollHeight, offsetHeight, tooltipHeight);
      
      // But don't exceed a reasonable maximum (to prevent issues with very tall content)
      const maxReasonableHeight = 500;
      actualRenderedHeight = Math.min(actualRenderedHeight, maxReasonableHeight);
    }
    
    const finalIsCenteredYCheck = transform.includes('translateY(-50%)') || transform.includes('translate(-50%, -50%)');
    const finalIsAboveCheck = transform.includes('translate(-50%, -100%)') || transform.includes('translate(-100%, -50%)');
    const finalActualTop = finalIsCenteredYCheck 
      ? finalTop - actualRenderedHeight / 2 
      : finalIsAboveCheck 
        ? finalTop - actualRenderedHeight 
        : finalTop;
    const finalActualBottom = finalActualTop + actualRenderedHeight;
    
    // CRITICAL: Ensure entire tooltip is visible - adjust aggressively if needed
    let boundedTop = finalTop;
    // safePadding is already declared at the top of the function
    
    // For step 1, ensure we maintain minimum spacing from element AND stay within viewport
    if (stepId === 'number-of-images') {
      // Calculate minimum top to avoid overlapping with element
      const minTopToAvoidOverlap = rect.bottom + 5; // Minimum spacing from element
      const step1BottomPadding = 50; // Extra bottom padding for step 1 to prevent cutoff

      // Aggressively check and fix bottom cutoff
      if (finalActualBottom > viewportHeight - step1BottomPadding) {
        // Tooltip goes off bottom - calculate exact position to keep it fully visible
        const targetBottom = viewportHeight - step1BottomPadding;
        const targetTop = targetBottom - actualRenderedHeight;
        // But don't go above the element
        boundedTop = Math.max(minTopToAvoidOverlap, targetTop);

        // Double-check: recalculate with new boundedTop
        const recalcActualTop = boundedTop;
        const recalcActualBottom = recalcActualTop + actualRenderedHeight;
        if (recalcActualBottom > viewportHeight - step1BottomPadding) {
          // Still doesn't fit - position at absolute bottom
          boundedTop = viewportHeight - step1BottomPadding - actualRenderedHeight;
          // But ensure we don't go above element
          if (boundedTop < minTopToAvoidOverlap) {
            boundedTop = minTopToAvoidOverlap;
          }
        }
      } else if (finalActualTop < safePadding) {
        // Tooltip is too high, but don't go above the element
        boundedTop = Math.max(minTopToAvoidOverlap, safePadding);
      } else {
        // Ensure we maintain minimum spacing from element
        boundedTop = Math.max(boundedTop, minTopToAvoidOverlap);
      }
    } else if (stepId === 'upload') {
      // For step 2, ensure it's within viewport
      // Check if positioned on left or right (side positioning)
      const isLeftPositioned = transform.includes('translate(-100%, -50%)');
      const isRightPositioned = transform.includes('translateY(-50%)') && !transform.includes('translateX');

      if (isLeftPositioned || isRightPositioned) {
        // Positioned on side - ensure vertical centering fits
        const actualTop = finalTop - actualRenderedHeight / 2;
        const actualBottom = finalTop + actualRenderedHeight / 2;

        if (actualTop < safePadding) {
          // Too high - adjust down
          boundedTop = safePadding + actualRenderedHeight / 2;
        } else if (actualBottom > viewportHeight - safePadding) {
          // Too low - adjust up
          boundedTop = viewportHeight - safePadding - actualRenderedHeight / 2;
        } else {
          boundedTop = finalTop; // Keep as is
        }
      } else {
        // Positioned below
        if (finalActualTop < safePadding) {
          boundedTop = safePadding;
        } else if (finalActualBottom > viewportHeight - safePadding) {
          boundedTop = viewportHeight - safePadding - actualRenderedHeight;
          if (boundedTop < safePadding) {
            boundedTop = safePadding;
          }
        } else {
          boundedTop = finalTop; // Keep as is
        }
      }
    } else {
      // For other steps, normal bounds checking with aggressive bottom check
      if (finalActualTop < safePadding) {
        if (finalIsCenteredYCheck) {
          boundedTop = safePadding + actualRenderedHeight / 2;
        } else if (finalIsAboveCheck) {
          boundedTop = safePadding + actualRenderedHeight;
        } else {
          boundedTop = safePadding;
        }
      } else if (finalActualBottom > viewportHeight - safePadding) {
        if (finalIsCenteredYCheck) {
          boundedTop = viewportHeight - safePadding - actualRenderedHeight / 2;
        } else if (finalIsAboveCheck) {
          boundedTop = viewportHeight - safePadding - actualRenderedHeight;
        } else {
          boundedTop = viewportHeight - safePadding - actualRenderedHeight;
        }
        // Double-check top doesn't go off screen
        const recalcActualTop = finalIsCenteredYCheck 
          ? boundedTop - actualRenderedHeight / 2 
          : finalIsAboveCheck
            ? boundedTop - actualRenderedHeight
            : boundedTop;
        if (recalcActualTop < safePadding) {
          if (finalIsCenteredYCheck) {
            boundedTop = safePadding + actualRenderedHeight / 2;
          } else {
            boundedTop = safePadding;
          }
        }
      }
    }
    
    // Final verification: ensure the tooltip will actually fit
    // IMPORTANT: Re-check viewport height here in case it changed during resize
    const currentViewportHeight = window.innerHeight;
    
    // Use actual rendered height from DOM - wait for it to be fully rendered
    let finalTooltipHeight = actualRenderedHeight;
    if (overlayRef.current) {
      // Use the larger of offsetHeight or scrollHeight to ensure we include all content including buttons
      const domHeight = Math.max(
        overlayRef.current.offsetHeight || 0,
        overlayRef.current.scrollHeight || 0
      );
      // Only use DOM height if it's reasonable (not 0 or too small)
      if (domHeight > 100) {
        finalTooltipHeight = domHeight;
      }
    }
    
    const finalVerificationTop = finalIsCenteredYCheck 
      ? boundedTop - finalTooltipHeight / 2 
      : finalIsAboveCheck 
        ? boundedTop - finalTooltipHeight 
        : boundedTop;
    const finalVerificationBottom = finalVerificationTop + finalTooltipHeight;
    
    // CRITICAL: Ensure bottom is always within CURRENT viewport with extra padding for buttons
    // Use extra padding for step 1 to prevent text cutoff
    const bottomPadding = stepId === 'number-of-images' ? 50 : (safePadding + 10); // Extra padding to ensure buttons are visible
    const maxBottom = currentViewportHeight - bottomPadding;
    
    if (finalVerificationBottom > maxBottom) {
      // Tooltip goes off bottom - calculate exact position to keep it fully visible
      const requiredTop = maxBottom - finalTooltipHeight;
      
      // Adjust boundedTop based on transform
      if (finalIsCenteredYCheck) {
        boundedTop = requiredTop + finalTooltipHeight / 2;
      } else if (finalIsAboveCheck) {
        boundedTop = requiredTop + finalTooltipHeight;
      } else {
        boundedTop = requiredTop;
      }
      
      // Recalculate to verify with current viewport
      const recalcTop = finalIsCenteredYCheck 
        ? boundedTop - finalTooltipHeight / 2 
        : finalIsAboveCheck 
          ? boundedTop - finalTooltipHeight 
          : boundedTop;
      const recalcBottom = recalcTop + finalTooltipHeight;
      
      // If still doesn't fit, adjust further - use current viewport height
      if (recalcBottom > maxBottom) {
        if (finalIsCenteredYCheck) {
          boundedTop = maxBottom - finalTooltipHeight / 2;
        } else if (finalIsAboveCheck) {
          boundedTop = maxBottom - finalTooltipHeight;
        } else {
          boundedTop = maxBottom - finalTooltipHeight;
        }
        
        // Ensure minimum spacing from element for step 1
        if (stepId === 'number-of-images') {
          const minTopToAvoidOverlap = rect.bottom + 5;
          if (boundedTop < minTopToAvoidOverlap) {
            // Can't fit without overlapping - position as high as possible while maintaining spacing
            boundedTop = Math.max(minTopToAvoidOverlap, maxBottom - finalTooltipHeight);
          }
        }
      }
    }
    
    // Ensure top doesn't go off screen - use current viewport
    const finalRecalcTop = finalIsCenteredYCheck 
      ? boundedTop - finalTooltipHeight / 2 
      : finalIsAboveCheck 
        ? boundedTop - finalTooltipHeight 
        : boundedTop;
    if (finalRecalcTop < safePadding) {
      if (finalIsCenteredYCheck) {
        boundedTop = safePadding + finalTooltipHeight / 2;
      } else if (finalIsAboveCheck) {
        boundedTop = safePadding + finalTooltipHeight;
      } else {
        boundedTop = safePadding;
      }
    }
    
    // Final double-check: ensure tooltip is completely within current viewport
    // This is the LAST check before returning - must be absolutely correct
    let absoluteTop = finalIsCenteredYCheck 
      ? boundedTop - finalTooltipHeight / 2 
      : finalIsAboveCheck 
        ? boundedTop - finalTooltipHeight 
        : boundedTop;
    let absoluteBottom = absoluteTop + finalTooltipHeight;
    
    // CRITICAL: Force tooltip to fit within viewport - adjust aggressively
    if (absoluteBottom > currentViewportHeight - bottomPadding) {
      // Tooltip extends beyond bottom - move it up
      const targetBottom = currentViewportHeight - bottomPadding;
      const targetTop = targetBottom - finalTooltipHeight;

      // Directly set boundedTop to targetTop for "below" positioning
      boundedTop = targetTop;

      // Recalculate to verify
      absoluteTop = boundedTop;
      absoluteBottom = absoluteTop + finalTooltipHeight;
    }
    
    // Ensure top doesn't go off screen
    if (absoluteTop < safePadding) {
      // Tooltip extends beyond top - move it down
      const targetTop = safePadding;
      
      // Adjust boundedTop to achieve targetTop
      if (finalIsCenteredYCheck) {
        boundedTop = targetTop + finalTooltipHeight / 2;
      } else if (finalIsAboveCheck) {
        boundedTop = targetTop + finalTooltipHeight;
      } else {
        boundedTop = targetTop;
      }
    }
    
    // Final absolute position check - one more time to be absolutely sure
    const finalAbsoluteTop = finalIsCenteredYCheck 
      ? boundedTop - finalTooltipHeight / 2 
      : finalIsAboveCheck 
        ? boundedTop - finalTooltipHeight 
        : boundedTop;
    const finalAbsoluteBottom = finalAbsoluteTop + finalTooltipHeight;
    
    // If tooltip still doesn't fit, we need to constrain it
    if (finalAbsoluteBottom > currentViewportHeight - bottomPadding) {
      // Calculate the maximum allowed top position
      const maxAllowedTop = currentViewportHeight - bottomPadding - finalTooltipHeight;
      boundedTop = maxAllowedTop;
      if (finalIsCenteredYCheck) {
        boundedTop = maxAllowedTop + finalTooltipHeight / 2;
      } else if (finalIsAboveCheck) {
        boundedTop = maxAllowedTop + finalTooltipHeight;
      }
    }
    
    if (finalAbsoluteTop < safePadding) {
      boundedTop = safePadding;
      if (finalIsCenteredYCheck) {
        boundedTop = safePadding + finalTooltipHeight / 2;
      } else if (finalIsAboveCheck) {
        boundedTop = safePadding + finalTooltipHeight;
      }
    }
    
    // CRITICAL: Final overlap check for ALL steps - ensure tooltip NEVER overlaps with highlighted element
    // This runs after ALL other calculations to catch any edge cases
    const minGap = 50; // Minimum gap to ensure no overlap

    // Calculate tooltip bounds based on final position and transform
    let finalTooltipRect = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    };
    
    if (transform.includes('translate(-100%, -50%)')) {
      // Left positioning (Step 2)
      finalTooltipRect.right = finalLeft;
      finalTooltipRect.left = finalLeft - actualTooltipWidth;
      finalTooltipRect.top = finalIsCenteredYCheck 
        ? boundedTop - actualRenderedHeight / 2 
        : boundedTop;
      finalTooltipRect.bottom = finalTooltipRect.top + actualRenderedHeight;
    } else if (transform.includes('translateX(-50%)')) {
      // Centered below/above (Step 1, Step 3, etc.)
      finalTooltipRect.left = finalLeft - actualTooltipWidth / 2;
      finalTooltipRect.right = finalLeft + actualTooltipWidth / 2;
      finalTooltipRect.top = boundedTop;
      finalTooltipRect.bottom = boundedTop + actualRenderedHeight;
    } else if (transform.includes('translate(-50%, -100%)')) {
      // Above positioning
      finalTooltipRect.left = finalLeft - actualTooltipWidth / 2;
      finalTooltipRect.right = finalLeft + actualTooltipWidth / 2;
      finalTooltipRect.bottom = boundedTop;
      finalTooltipRect.top = boundedTop - actualRenderedHeight;
    } else {
      // Default: centered
      finalTooltipRect.left = finalLeft - actualTooltipWidth / 2;
      finalTooltipRect.right = finalLeft + actualTooltipWidth / 2;
      finalTooltipRect.top = boundedTop - actualRenderedHeight / 2;
      finalTooltipRect.bottom = boundedTop + actualRenderedHeight / 2;
    }
    
    // Check for ANY overlap with element (with buffer)
    const buffer = minGap;
    const overlapsHorizontally = !(finalTooltipRect.right < rect.left - buffer || finalTooltipRect.left > rect.right + buffer);
    const overlapsVertically = !(finalTooltipRect.bottom < rect.top - buffer || finalTooltipRect.top > rect.bottom + buffer);

    if (overlapsHorizontally && !overlapsVertically) {
      // Overlapping horizontally - reposition
      if (stepId === 'upload') {
        // Step 2: Keep on left/right side or position below as fallback
        const spaceOnLeft = rect.left - padding;
        const spaceOnRight = viewportWidth - rect.right - padding;
        const requiredSpace = actualTooltipWidth; // No buffer for step 2

        if (spaceOnLeft >= requiredSpace) {
          // Keep on left
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.left - spacing;
          transform = 'translate(-100%, -50%)';
        } else if (spaceOnRight >= requiredSpace) {
          // Position on right
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.right + spacing;
          transform = 'translateY(-50%)';
        } else {
          // Not enough space on either side - position below
          boundedTop = rect.bottom + 30;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
        }
      } else if (stepId === 'upload') {
        // Step 2: Keep on left/right or fallback to below
        const spaceOnLeft = rect.left - padding;
        const spaceOnRight = viewportWidth - rect.right - padding;
        const requiredSpace = actualTooltipWidth; // No buffer for step 2

        if (spaceOnLeft >= requiredSpace) {
          // Position on left
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.left - spacing;
          transform = 'translate(-100%, -50%)';
        } else if (spaceOnRight >= requiredSpace) {
          // Position on right
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.right + spacing;
          transform = 'translateY(-50%)';
        } else {
          // Position below
          boundedTop = rect.bottom + 30;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
        }
      } else {
        // Other steps: position below element
        boundedTop = rect.bottom + 30;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
    } else if (!overlapsHorizontally && overlapsVertically) {
      // Overlapping vertically - move further away
      if (stepId === 'number-of-images') {
        // Step 1: Ensure it's below with proper spacing
        boundedTop = rect.bottom + 5;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      } else {
        // Other steps: position below
        boundedTop = rect.bottom + 30;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
    } else if (overlapsHorizontally && overlapsVertically) {
      // Overlapping both horizontally and vertically - reposition based on step
      if (stepId === 'upload') {
        // Step 2: Try left, then right, then below
        const spaceOnLeft = rect.left - padding;
        const spaceOnRight = viewportWidth - rect.right - padding;
        const requiredSpace = actualTooltipWidth; // No buffer for step 2

        if (spaceOnLeft >= requiredSpace) {
          // Position on left
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.left - 30;
          transform = 'translate(-100%, -50%)';
        } else if (spaceOnRight >= requiredSpace) {
          // Position on right
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.right + 30;
          transform = 'translateY(-50%)';
        } else {
          // Go below as fallback
          boundedTop = rect.bottom + 30;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
        }
      } else {
        // Other steps: position below
        boundedTop = rect.bottom + 30;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
    }
    
    // Final double-check: recalculate tooltip bounds with new position
    if (transform.includes('translateX(-50%)')) {
      finalTooltipRect.left = finalLeft - actualTooltipWidth / 2;
      finalTooltipRect.right = finalLeft + actualTooltipWidth / 2;
      finalTooltipRect.top = boundedTop;
      finalTooltipRect.bottom = boundedTop + actualRenderedHeight;

      // Verify no overlap with new position
      const stillOverlapsH = !(finalTooltipRect.right < rect.left - buffer || finalTooltipRect.left > rect.right + buffer);
      const stillOverlapsV = !(finalTooltipRect.bottom < rect.top - buffer || finalTooltipRect.top > rect.bottom + buffer);

      if (stillOverlapsH || stillOverlapsV) {
        // Still overlapping - move even further away
        boundedTop = rect.bottom + 50; // Extra spacing
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
    } else if (transform.includes('translate(-100%, -50%)')) {
      // Left positioning - recalculate bounds
      finalTooltipRect.left = finalLeft - actualTooltipWidth;
      finalTooltipRect.right = finalLeft;
      finalTooltipRect.top = boundedTop - actualRenderedHeight / 2;
      finalTooltipRect.bottom = boundedTop + actualRenderedHeight / 2;

      // Verify no overlap
      const stillOverlapsH = !(finalTooltipRect.right < rect.left - buffer || finalTooltipRect.left > rect.right + buffer);
      const stillOverlapsV = !(finalTooltipRect.bottom < rect.top - buffer || finalTooltipRect.top > rect.bottom + buffer);

      if (stillOverlapsH || stillOverlapsV) {
        // Try to move further left or switch to below
        const spaceOnLeft = rect.left - padding;
        if (spaceOnLeft >= actualTooltipWidth + buffer + 50) {
          // Move further left
          finalLeft = rect.left - buffer - 50;
        } else {
          // Not enough space - switch to below
          boundedTop = rect.bottom + 50;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
        }
      }
    }
    
    // ABSOLUTE FINAL CHECK: One last verification using the absolute latest viewport height
    // This catches any edge cases where the viewport changed during calculation
    const absoluteLatestViewportHeight = window.innerHeight;
    const absoluteLatestTop = finalIsCenteredYCheck 
      ? boundedTop - finalTooltipHeight / 2 
      : finalIsAboveCheck 
        ? boundedTop - finalTooltipHeight 
        : boundedTop;
    const absoluteLatestBottom = absoluteLatestTop + finalTooltipHeight;
    
    // If tooltip would still be cut off, force it to fit
    if (absoluteLatestBottom > absoluteLatestViewportHeight - bottomPadding) {
      // Calculate the maximum allowed top position
      const maxAllowedBottom = absoluteLatestViewportHeight - bottomPadding;
      const maxAllowedTop = maxAllowedBottom - finalTooltipHeight;
      
      // Adjust boundedTop to ensure tooltip fits
      if (finalIsCenteredYCheck) {
        boundedTop = maxAllowedTop + finalTooltipHeight / 2;
      } else if (finalIsAboveCheck) {
        boundedTop = maxAllowedTop + finalTooltipHeight;
      } else {
        boundedTop = maxAllowedTop;
      }
      
      // For step 1, ensure we maintain minimum spacing from element
      if (stepId === 'number-of-images') {
        const minTopToAvoidOverlap = rect.bottom + 5;
        if (boundedTop < minTopToAvoidOverlap) {
          // Can't fit without overlapping - position as high as possible
          boundedTop = Math.max(minTopToAvoidOverlap, maxAllowedTop);
        }
      }
    }
    
    // FINAL FINAL CHECK: Get viewport height ONE MORE TIME right before returning
    // This is the absolute last chance to ensure the tooltip fits AND doesn't overlap
    const veryLatestViewportHeight = window.innerHeight;
    const veryLatestTop = finalIsCenteredYCheck 
      ? boundedTop - finalTooltipHeight / 2 
      : finalIsAboveCheck 
        ? boundedTop - finalTooltipHeight 
        : boundedTop;
    const veryLatestBottom = veryLatestTop + finalTooltipHeight;
    
    // CRITICAL: Check for overlap with highlighted element FIRST, before viewport bounds
    // Calculate tooltip bounds based on current transform
    const isCenteredXFinal = transform.includes('translateX(-50%)') || transform.includes('translate(-50%');
    const isLeftPositioned = transform.includes('translate(-100%');
    let tooltipFinalBounds = {
      top: veryLatestTop,
      bottom: veryLatestBottom,
      left: isCenteredXFinal
        ? finalLeft - actualTooltipWidth / 2 
        : (isLeftPositioned ? finalLeft - actualTooltipWidth : finalLeft),
      right: isCenteredXFinal
        ? finalLeft + actualTooltipWidth / 2 
        : (isLeftPositioned ? finalLeft : finalLeft + actualTooltipWidth)
    };
    
    // Check for overlap with element (with buffer)
    const overlapBuffer = 30; // Increased minimum gap between tooltip and element
    const overlapsH = !(tooltipFinalBounds.right < rect.left - overlapBuffer || tooltipFinalBounds.left > rect.right + overlapBuffer);
    const overlapsV = !(tooltipFinalBounds.bottom < rect.top - overlapBuffer || tooltipFinalBounds.top > rect.bottom + overlapBuffer);
    
    // If overlapping, reposition to avoid overlap
    if (overlapsH && overlapsV) {
      // Overlapping both horizontally and vertically - choose best position
      if (stepId === 'upload') {
        const spaceOnLeft = rect.left - padding;
        const spaceOnRight = viewportWidth - rect.right - padding;
        const requiredSpace = actualTooltipWidth; // No buffer for step 2

        if (spaceOnLeft >= requiredSpace) {
          // Position on left
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.left - overlapBuffer;
          transform = 'translate(-100%, -50%)';
        } else if (spaceOnRight >= requiredSpace) {
          // Position on right
          boundedTop = rect.top + rect.height / 2;
          finalLeft = rect.right + overlapBuffer;
          transform = 'translateY(-50%)';
        } else {
          // Position below
          boundedTop = rect.bottom + overlapBuffer;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
        }
      } else {
        // Other steps: position below element
        boundedTop = rect.bottom + overlapBuffer;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
      
      // Recalculate bounds
      tooltipFinalBounds.top = boundedTop;
      tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight;
      tooltipFinalBounds.left = finalLeft - actualTooltipWidth / 2;
      tooltipFinalBounds.right = finalLeft + actualTooltipWidth / 2;
    } else if (overlapsH) {
      // Overlapping horizontally - this is critical for step 2 (drag and drop box)
      // FORCE position below element to avoid ANY overlap
      boundedTop = rect.bottom + overlapBuffer + 10; // Extra spacing
      finalLeft = rect.left + rect.width / 2;
      transform = 'translateX(-50%)';
      
      // Recalculate bounds to verify no overlap
      tooltipFinalBounds.top = boundedTop;
      tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight;
      tooltipFinalBounds.left = finalLeft - actualTooltipWidth / 2;
      tooltipFinalBounds.right = finalLeft + actualTooltipWidth / 2;
      
      // Double-check: if still overlapping, move even further down
      const stillOverlapsH = !(tooltipFinalBounds.right < rect.left - overlapBuffer || tooltipFinalBounds.left > rect.right + overlapBuffer);
      const stillOverlapsV = !(tooltipFinalBounds.bottom < rect.top - overlapBuffer || tooltipFinalBounds.top > rect.bottom + overlapBuffer);
      
      if (stillOverlapsH || stillOverlapsV) {
        boundedTop = rect.bottom + overlapBuffer + 20; // Even more spacing
      }
      
      // Recalculate bounds
      tooltipFinalBounds.top = transform.includes('translate(-100%') 
        ? boundedTop - finalTooltipHeight / 2 
        : boundedTop;
      tooltipFinalBounds.bottom = tooltipFinalBounds.top + finalTooltipHeight;
      tooltipFinalBounds.left = transform.includes('translate(-100%')
        ? finalLeft - actualTooltipWidth
        : finalLeft - actualTooltipWidth / 2;
      tooltipFinalBounds.right = transform.includes('translate(-100%')
        ? finalLeft
        : finalLeft + actualTooltipWidth / 2;
    } else if (overlapsV) {
      // Overlapping vertically - adjust based on step
      if (stepId === 'number-of-images') {
        // Step 1: Ensure it's below with proper spacing
        boundedTop = rect.bottom + overlapBuffer;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      } else if (stepId === 'upload' && transform.includes('translate(-100%, -50%)')) {
        // Step 2 on left: Keep on left, just adjust vertical centering to avoid overlap
        boundedTop = rect.top + rect.height / 2;
        // Don't change transform - keep it on the left
      } else {
        // Other steps: position below
        boundedTop = rect.bottom + overlapBuffer;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }

      // Recalculate bounds based on current transform
      if (transform.includes('translate(-100%, -50%)')) {
        // Left positioning
        tooltipFinalBounds.top = boundedTop - finalTooltipHeight / 2;
        tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight / 2;
        tooltipFinalBounds.left = finalLeft - actualTooltipWidth;
        tooltipFinalBounds.right = finalLeft;
      } else {
        // Below positioning
        tooltipFinalBounds.top = boundedTop;
        tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight;
        tooltipFinalBounds.left = finalLeft - actualTooltipWidth / 2;
        tooltipFinalBounds.right = finalLeft + actualTooltipWidth / 2;
      }
    }
    
    // Double-check: verify no overlap after repositioning
    const finalOverlapsH = !(tooltipFinalBounds.right < rect.left - overlapBuffer || tooltipFinalBounds.left > rect.right + overlapBuffer);
    const finalOverlapsV = !(tooltipFinalBounds.bottom < rect.top - overlapBuffer || tooltipFinalBounds.top > rect.bottom + overlapBuffer);
    
    if (finalOverlapsH || finalOverlapsV) {
      // Still overlapping - reposition based on step
      if (stepId === 'upload' && transform.includes('translate(-100%, -50%)')) {
        // Step 2 on left: Move further left or switch to below if not enough space
        const spaceOnLeft = rect.left - padding;
        if (spaceOnLeft >= actualTooltipWidth + overlapBuffer + 40) {
          // Move further left
          finalLeft = rect.left - overlapBuffer - 40;
          // Keep left transform
        } else {
          // Not enough space on left - switch to below
          boundedTop = rect.bottom + overlapBuffer + 20;
          finalLeft = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
        }
      } else {
        // Other steps: position below with extra spacing
        boundedTop = rect.bottom + overlapBuffer + 20;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }

      // Recalculate one more time based on transform
      if (transform.includes('translate(-100%, -50%)')) {
        tooltipFinalBounds.top = boundedTop - finalTooltipHeight / 2;
        tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight / 2;
        tooltipFinalBounds.left = finalLeft - actualTooltipWidth;
        tooltipFinalBounds.right = finalLeft;
      } else {
        tooltipFinalBounds.top = boundedTop;
        tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight;
        tooltipFinalBounds.left = finalLeft - actualTooltipWidth / 2;
        tooltipFinalBounds.right = finalLeft + actualTooltipWidth / 2;
      }
    }
    
    // Step 2: Verify no overlap with element (but don't force positioning)
    // The smart positioning earlier already chose the best position
    if (stepId === 'upload') {
      // This check is already done - trust the earlier positioning logic
      // No need to override here
    }
    
    // Now check viewport bounds - ensure tooltip fits within viewport
    // BUT for step 2, prioritize overlap prevention over viewport bounds
    if (tooltipFinalBounds.bottom > veryLatestViewportHeight - bottomPadding) {
      const forcedMaxBottom = veryLatestViewportHeight - bottomPadding;
      const forcedMaxTop = forcedMaxBottom - finalTooltipHeight;
      
      // Directly set boundedTop to ensure it fits, but maintain spacing from element
      if (stepId === 'number-of-images') {
        const minTopToAvoidOverlap = rect.bottom + overlapBuffer;
        // Use the higher of the two: minimum spacing from element OR viewport constraint
        boundedTop = Math.max(minTopToAvoidOverlap, forcedMaxTop);
      } else if (stepId === 'upload') {
        // Step 2: Maintain side positioning or fallback to below
        if (transform.includes('translate(-100%, -50%)') || transform.includes('translateY(-50%)')) {
          // Side positioning - keep it and ensure vertical centering fits
          boundedTop = Math.max(padding + finalTooltipHeight / 2, Math.min(boundedTop, veryLatestViewportHeight - padding - finalTooltipHeight / 2));
        } else {
          // Position below but ensure it fits
          const minTopToAvoidOverlap = rect.bottom + 20;
          boundedTop = Math.min(minTopToAvoidOverlap, forcedMaxTop);
        }
      } else {
        if (finalIsCenteredYCheck) {
          boundedTop = forcedMaxTop + finalTooltipHeight / 2;
        } else if (finalIsAboveCheck) {
          boundedTop = forcedMaxTop + finalTooltipHeight;
        } else {
          boundedTop = forcedMaxTop;
        }
      }
      
      // Verify it now fits
      const verifyTop = finalIsCenteredYCheck 
        ? boundedTop - finalTooltipHeight / 2 
        : finalIsAboveCheck 
          ? boundedTop - finalTooltipHeight 
          : boundedTop;
      const verifyBottom = verifyTop + finalTooltipHeight;
      
      // If STILL doesn't fit, use the absolute maximum
      if (verifyBottom > veryLatestViewportHeight - bottomPadding) {
        boundedTop = veryLatestViewportHeight - bottomPadding - finalTooltipHeight;
        if (finalIsCenteredYCheck) {
          boundedTop = veryLatestViewportHeight - bottomPadding - finalTooltipHeight / 2;
        }
      }
    }
    
    // Step 2: Final check to ensure tooltip is fully visible
    if (stepId === 'upload' && targetElement) {
      const freshRect = targetElement.getBoundingClientRect();

      // Handle different positioning transforms
      if (transform === 'translate(-100%, -50%)') {
        // Positioned on LEFT - ensure vertical centering stays within viewport
        const actualTop = boundedTop - finalTooltipHeight / 2;
        const actualBottom = boundedTop + finalTooltipHeight / 2;

        if (actualTop < padding) {
          boundedTop = padding + finalTooltipHeight / 2;
        } else if (actualBottom > veryLatestViewportHeight - bottomPadding) {
          boundedTop = veryLatestViewportHeight - bottomPadding - finalTooltipHeight / 2;
        }

        // Ensure doesn't go off left edge
        const tooltipLeft = finalLeft - actualTooltipWidth;
        if (tooltipLeft < padding) {
          // Try switching to right or below
          const spaceOnRight = viewportWidth - freshRect.right - padding;
          if (spaceOnRight >= actualTooltipWidth) {
            // Switch to right
            boundedTop = freshRect.top + freshRect.height / 2;
            finalLeft = freshRect.right + 30;
            transform = 'translateY(-50%)';
          } else {
            // Switch to below
            boundedTop = freshRect.bottom + 30;
            finalLeft = freshRect.left + freshRect.width / 2;
            transform = 'translateX(-50%)';
          }
        }
      } else if (transform === 'translateY(-50%)') {
        // Positioned on RIGHT - ensure vertical centering stays within viewport
        const actualTop = boundedTop - finalTooltipHeight / 2;
        const actualBottom = boundedTop + finalTooltipHeight / 2;

        if (actualTop < padding) {
          boundedTop = padding + finalTooltipHeight / 2;
        } else if (actualBottom > veryLatestViewportHeight - bottomPadding) {
          boundedTop = veryLatestViewportHeight - bottomPadding - finalTooltipHeight / 2;
        }

        // Ensure doesn't go off right edge
        const tooltipRight = finalLeft + actualTooltipWidth;
        if (tooltipRight > viewportWidth - padding) {
          // Switch to below
          boundedTop = freshRect.bottom + 30;
          finalLeft = freshRect.left + freshRect.width / 2;
          transform = 'translateX(-50%)';
        }
      } else if (transform === 'translateX(-50%)') {
        // Positioned below - ensure it fits
        const actualBottom = boundedTop + finalTooltipHeight;
        if (actualBottom > veryLatestViewportHeight - bottomPadding) {
          boundedTop = veryLatestViewportHeight - bottomPadding - finalTooltipHeight;
        }
      }
    }
    
    // ABSOLUTE FINAL SAFETY CHECK: Ensure tooltip fits within viewport
    // This is the last line of defense before returning
    const finalBottomEdge = transform.includes('translateY(-50%)') || transform.includes('translate(-50%, -50%)')
      ? boundedTop + finalTooltipHeight / 2
      : transform.includes('translate(-50%, -100%)') || transform.includes('translate(-100%, -50%)')
        ? boundedTop
        : boundedTop + finalTooltipHeight;

    // Use extra bottom padding for step 1 to prevent text cutoff
    const finalBottomPadding = stepId === 'number-of-images' ? 50 : 35; // Extra padding at bottom
    if (finalBottomEdge > currentViewportHeight - finalBottomPadding) {
      const maxAllowedTop = currentViewportHeight - finalBottomPadding - finalTooltipHeight;
      boundedTop = Math.max(padding, maxAllowedTop);
    }

    // Return final style (no caching for step 2 and other steps)
    return {
      position: 'fixed' as const,
      top: `${boundedTop}px`,
      left: `${finalLeft}px`,
      transform,
      zIndex: 100002, // Higher than both backdrop (99998) and highlight (100001)
      maxWidth: `${maxTooltipWidth}px`,
      maxHeight: `${maxTooltipHeight}px`,
      width: 'auto'
    };
  };

  // Find target element for current step
  useEffect(() => {
    // Set transitioning state to hide overlay during step change
    setIsTransitioning(true);

    // Clear previous element, highlight, and tooltip immediately when step changes
    setTargetElement(null);
    setHighlightStyle({});
    setTooltipStyle({});

    if (isCompleted || isSkipped || !currentStepData?.targetSelector) {
      setIsTransitioning(false);
      return;
    }

    // For steps 3 and 4, they don't need target elements - end transition immediately
    const stepId = currentStepData?.id;
    const isStep3or4 = stepId === 'restore' || stepId === 'results';
    if (isStep3or4) {
      setIsTransitioning(false);
      return;
    }

    // Wait for DOM to be ready and element to be fully rendered
    const findElement = () => {
      if (!currentStepData.targetSelector) {
        return false;
      }

      try {
        const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
        if (element) {
          // Verify element is actually visible and has dimensions
          const rect = element.getBoundingClientRect();
          console.log('[Step ' + currentStepData.id + '] Found element with selector:', currentStepData.targetSelector, 'Rect:', rect);
          if (rect.width > 0 && rect.height > 0) {
            console.log('[Step ' + currentStepData.id + '] Element is valid, setting targetElement');
            setTargetElement(element);
            // Add delay before ending transition to let everything settle completely
            setTimeout(() => {
              setIsTransitioning(false);
            }, 150);
            return true;
          } else {
            // Element exists but not yet rendered, try again
            console.log('[Step ' + currentStepData.id + '] Element has no dimensions, will retry');
            return false;
          }
        } else {
          console.log('[Step ' + currentStepData.id + '] Element not found for selector:', currentStepData.targetSelector);
          return false;
        }
      } catch (error) {
        return false;
      }
    };

    // For step 1 and step 2, use requestAnimationFrame to ensure consistent measurements
    // This ensures we measure after the browser has completed rendering
    const isStep1 = stepId === 'number-of-images';
    const isStep2 = stepId === 'upload';

    if (isStep1 || isStep2) {
      // Add a delay first to ensure old highlights are completely cleared, then use requestAnimationFrame
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!findElement()) {
                setTimeout(() => {
                  findElement();
                }, 50);
              }
            });
          });
        });
      }, 250);
    } else {
      // For other steps, use normal delay
      const initialDelay = setTimeout(() => {
        if (!findElement()) {
          setTimeout(() => {
            if (!findElement()) {
              setTimeout(() => {
                findElement();
              }, 100);
            }
          }, 50);
        }
      }, 10);

      return () => clearTimeout(initialDelay);
    }
  }, [currentStep, currentStepData, isCompleted, isSkipped]);

  // Update highlight position and size when target element changes or resizes
  useEffect(() => {
    const stepId = currentStepData?.id;
    const isStep3or4 = stepId === 'restore' || stepId === 'results';

    console.log('[Highlight] Step:', stepId, 'Has targetElement:', !!targetElement, 'isStep3or4:', isStep3or4);

    // For steps 3 and 4, don't show highlight box
    if (!targetElement || isStep3or4) {
      setHighlightStyle({});
      return;
    }

    console.log('[Highlight] Will show highlight for step:', stepId);

    const isStep1 = stepId === 'number-of-images';
    const isStep2 = stepId === 'upload';

    const updateHighlight = () => {
      // Verify element still exists and is in the DOM
      if (!targetElement || !document.contains(targetElement)) {
        return;
      }

      // Get element dimensions first to verify it's ready
      const rect = targetElement.getBoundingClientRect();

      console.log('[Highlight updateHighlight] Step:', stepId, 'Element rect:', rect, 'Element:', targetElement);

      // Skip if element has no dimensions (not yet rendered)
      if (rect.width === 0 && rect.height === 0) {
        console.log('[Highlight updateHighlight] Skipping - element has no dimensions');
        return;
      }

      // Ensure element is actually positioned (not at 0,0 which indicates not ready)
      if (rect.top === 0 && rect.left === 0) {
        // Element might not be positioned yet, skip this update
        console.log('[Highlight updateHighlight] Skipping - element at 0,0');
        return;
      }

      // For step 1 (number-of-images), ensure we're highlighting just the button container
      // Use FIXED values to ensure consistent positioning every time
      let padding = 0;
      let topOffset = 0; // Additional offset for top alignment
      let heightAdjustment = 0; // Additional adjustment for height

      if (isStep1) {
        // FIXED values for perfect centering around the batch number buttons
        padding = 10; // Even padding on all sides for perfect centering
        topOffset = -6.5; // Move up by 6.5px to perfectly center around the buttons
        heightAdjustment = 0; // No height adjustment - use element's natural height

        // Calculate highlight position using the element's bounding rect
        // Always recalculate to ensure consistency (no caching)
        const highlightTop = rect.top - padding + topOffset;
        const highlightLeft = rect.left - padding;
        const highlightWidth = rect.width + (padding * 2);
        const highlightHeight = rect.height + (padding * 2) + heightAdjustment;

        const highlightStyleValue = {
          position: 'fixed' as const,
          top: `${highlightTop}px`,
          left: `${highlightLeft}px`,
          width: `${highlightWidth}px`,
          height: `${highlightHeight}px`,
          zIndex: 100001 // Higher than tooltip to ensure highlight is always visible
        };

        // Set the highlight style
        setHighlightStyle(highlightStyleValue);
        return; // Early return for step 1 to avoid any other adjustments
      }

      // For step 2, use standard padding around the upload zone
      if (isStep2) {
        padding = 20; // Standard padding for upload zone highlight
      }

      // For other steps (step 2), use normal calculation WITHOUT caching
      const highlightStyleValue = {
        position: 'fixed' as const,
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + (padding * 2)}px`,
        height: `${rect.height + (padding * 2)}px`,
        zIndex: 100001 // Higher than tooltip to ensure highlight is always visible
      };

      console.log('[Highlight] Setting highlight style for step 2:', highlightStyleValue);

      setHighlightStyle(highlightStyleValue);
    };

    // Use requestAnimationFrame to ensure DOM is fully updated
    // For step 2, calculate immediately to avoid delay/glitch
    const initialUpdate = () => {
      if (isStep2) {
        // For step 2, calculate immediately with minimal delay to avoid glitch
        requestAnimationFrame(() => {
          if (!targetElement || !document.contains(targetElement)) {
            return;
          }
          const rect = targetElement.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            updateHighlight();
          } else {
            // If not ready, try once more quickly
            requestAnimationFrame(() => {
              if (targetElement && document.contains(targetElement)) {
                updateHighlight();
              }
            });
          }
        });
      } else {
        // For step 1, wait longer to ensure element is stable
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Triple RAF to ensure layout is completely stable
                // Verify element position is stable before setting highlight
                if (!targetElement || !document.contains(targetElement)) {
                  return;
                }
                
                const rect = targetElement.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && rect.top > 0 && rect.left > 0) {
                  // Element is ready and positioned, update highlight
                  updateHighlight();
                } else {
                  // If still not ready, try one more time with longer delay
                  setTimeout(() => {
                    if (targetElement && document.contains(targetElement)) {
                      requestAnimationFrame(() => updateHighlight());
                    }
                  }, 150);
                }
              });
            });
          });
        }, 150); // Longer delay to ensure element is stable, especially on restart
      }
    };

    initialUpdate();

    // Watch for resize/position changes
    // ResizeObserver watches element size changes, but we also need window resize for position changes
    const resizeObserver = new ResizeObserver(() => {
      // Always update on resize for responsive behavior
      updateHighlight();
    });

    if (targetElement) {
      resizeObserver.observe(targetElement);
      if (document.body) {
        resizeObserver.observe(document.body);
      }
    }

    // Also update on scroll and window resize (throttled)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (isStep1) {
        // Don't update highlight on scroll for step 1 to maintain consistent position
        return;
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        requestAnimationFrame(updateHighlight);
      }, 16); // ~60fps
    };

    const handleResize = () => {
      // Update IMMEDIATELY with no delay for maximum responsiveness
      updateHighlight();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    // Also listen to orientation change for mobile devices
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(scrollTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [targetElement, currentStepData]);

  // Recalculate position when window resizes or target element changes
  useEffect(() => {
    if (isCompleted || isSkipped) return;

    const updatePosition = () => {
      // Don't update position during transition
      if (isTransitioning) return;

      // Update immediately with no delay for maximum responsiveness
      const style = getOverlayStyle();
      setTooltipStyle(style);
    };

    // Wait for transition state to settle before initial position calculation
    // This prevents race condition when currentStep changes
    if (!isTransitioning) {
      requestAnimationFrame(() => {
        if (!isTransitioning) {
          updatePosition();
        }
      });
    }
    
    // Update on resize immediately with no delay for maximum responsiveness
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      // Clear any pending resize timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      // Update position immediately - use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        updatePosition();
      });
      // Also update after a short delay to catch any layout changes
      resizeTimeout = setTimeout(() => {
        updatePosition();
      }, 0);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', updatePosition, true);
    
    // Also update when tooltip content changes
    const observer = new ResizeObserver(() => {
      updatePosition();
    });
    
    if (overlayRef.current) {
      observer.observe(overlayRef.current);
    }
    
    // Also observe document body to catch layout changes that affect positioning
    if (document.body) {
      observer.observe(document.body);
    }
    
    // Listen to orientation change for mobile devices
    const handleOrientationChange = () => {
      setTimeout(() => {
        requestAnimationFrame(updatePosition);
      }, 100); // Small delay to let orientation change complete
    };
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('orientationchange', handleOrientationChange);
      observer.disconnect();
    };
  }, [targetElement, isCompleted, isSkipped, isTransitioning]);

  // Don't render if completed or skipped
  if (isCompleted || isSkipped) {
    return null;
  }

  const handleSkip = () => {
    // Don't clear cache - keep it for consistency when reopening
    skip();
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep >= totalSteps - 1) {
      // Don't clear cache - keep it for consistency when reopening
      complete();
      onComplete?.();
    } else {
      nextStep();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="onboarding-backdrop"
        onClick={handleSkip}
      />

      {/* Highlight overlay for target element */}
      {!isTransitioning && targetElement && Object.keys(highlightStyle).length > 0 && (
        <div
          className="onboarding-highlight"
          style={highlightStyle}
        />
      )}

      {/* Tooltip/Instruction box */}
      <div
        ref={overlayRef}
        className="onboarding-tooltip"
        style={{
          ...tooltipStyle,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.1s ease-in-out'
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
