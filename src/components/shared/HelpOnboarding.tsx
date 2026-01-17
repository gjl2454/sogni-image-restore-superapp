import React, { useEffect, useRef, useState } from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { ONBOARDING_STEPS, type OnboardingStep } from '../../utils/onboardingSteps';
import './HelpOnboarding.css';

// Module-level cache for step 1 highlight position - persists across component remounts
let step1HighlightCache: React.CSSProperties | null = null;
// Track the last step to detect when returning to step 1
let lastStepId: string | null = null;
// Track if we should use the cached position for step 1 (prevents recalculation on observer triggers)
let shouldUseStep1Cache = false;
// Clear cache function - call this to reset cache if it's wrong
export function clearStep1Cache() {
  step1HighlightCache = null;
  shouldUseStep1Cache = false;
  lastStepId = null;
}

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
  const overlayRef = useRef<HTMLDivElement>(null);
  // Use ref to track cache flag so observer callbacks always have current value
  const shouldUseCacheRef = useRef(false);

  const currentStepData = ONBOARDING_STEPS[currentStep];

  // Calculate overlay position based on target element
  const getOverlayStyle = (): React.CSSProperties => {
    // IMPORTANT: Always get current viewport dimensions - don't cache them
    // This ensures we use the latest viewport size during resize
    const padding = 20;
    const safePadding = padding + 5; // Extra safety margin to prevent cutoff
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight; // Always get current height
    // Use fixed dimensions for tooltip - size should remain constant
    const maxTooltipWidth = 400; // Fixed width, don't adjust based on viewport
    // Use fixed max height, but ensure it doesn't exceed viewport for positioning calculations
    const maxTooltipHeight = 350; // Fixed height, but we'll still check viewport bounds for positioning

    if (!targetElement) {
      // Center the tooltip if no target element
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100000,
        maxWidth: `${maxTooltipWidth}px`,
        maxHeight: `${maxTooltipHeight}px`,
        width: 'auto'
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const position = currentStepData.position || 'bottom';
    const stepId = currentStepData.id;
    
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
      // Small spacing to place tooltip directly below without covering
      const extraSpacing = 12; // Reduced spacing to move tooltip up slightly
      top = rect.bottom + extraSpacing;
      left = rect.left + rect.width / 2;
      transform = 'translateX(-50%)'; // ALWAYS below - never change this
      
      // Only adjust the exact top position to fit within viewport, but ALWAYS keep it below
      // Never change transform to 'translate(-50%, -100%)' for step 1
      const tooltipBottom = top + tooltipHeight;
      // Add extra padding at bottom to prevent cutoff
      const bottomPadding = 30;
      if (tooltipBottom > viewportHeight - padding - bottomPadding) {
        // Adjust top to fit, but keep it below the element with minimum spacing
        top = Math.max(rect.bottom + extraSpacing, viewportHeight - padding - tooltipHeight - bottomPadding);
        // Ensure we maintain minimum spacing from the element (at least 12px)
        if (top < rect.bottom + 12) {
          top = rect.bottom + 12; // Minimum spacing to avoid overlap
        }
      }
      // Final check: ensure we're not overlapping with the element
      // Always maintain at least 12px spacing to prevent covering
      if (top < rect.bottom + 12) {
        top = rect.bottom + 12; // Ensure proper spacing to avoid covering
      }
    } else if (stepId === 'upload') {
      // Step 2: ALWAYS position below the drag and drop box to NEVER cover it
      // Never position to the left to avoid any risk of overlap
      top = rect.bottom + 40; // Extra spacing to ensure no overlap
      left = rect.left + rect.width / 2;
      transform = 'translateX(-50%)';
    } else {
      // Other steps: Use the configured position
      switch (position) {
        case 'top':
          top = rect.top - spacing;
          transform = 'translate(-50%, -100%)';
          // If tooltip would go off top, position below instead
          if (top - tooltipHeight < padding) {
            top = rect.bottom + spacing;
            transform = 'translateX(-50%)';
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
      // Enforce minimum spacing of 20px to place tooltip right below highlighted element
      const minSpacing = 20;
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
        // Final safety check: ensure we're never closer than 20px
        if (top < rect.bottom + 20) {
          top = rect.bottom + 20; // Minimum spacing to avoid covering
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
          if (position === 'bottom' || (!position || position === 'bottom')) {
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
      // Step 2: Keep on left side, but ensure no overlap with element
      // With translate(-100%, -50%), tooltipLeft = left - tooltipWidth
      // We need: tooltipLeft + tooltipWidth (which is 'left') < rect.left - 30
      const minGap = 30;
      if (tooltipLeft < padding) {
        left = padding + tooltipWidth; // Keep on left but within viewport
      }
      // Also check for overlap with element
      const tooltipRightEdge = left; // With translate(-100%, -50%), right edge is at 'left'
      if (tooltipRightEdge > rect.left - minGap) {
        // Would overlap, move further left
        left = rect.left - minGap - tooltipWidth;
        if (left < padding) {
          // Not enough space, position below instead
          top = rect.bottom + 30;
          left = rect.left + rect.width / 2;
          transform = 'translateX(-50%)';
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
      const bottomPadding = 30;
      if (tooltipBottom > viewportHeight - padding - bottomPadding) {
        // Adjust top to fit, but keep it below the element with minimum spacing
        top = Math.max(rect.bottom + 12, viewportHeight - padding - tooltipHeight - bottomPadding);
      }
      // Final check: ensure minimum spacing is maintained
      if (top < rect.bottom + 12) {
        top = rect.bottom + 12; // Ensure proper spacing - right below the element
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
    const actualTooltipTop = finalIsCenteredY 
      ? top - tooltipHeight / 2 
      : finalIsAbove 
        ? top - tooltipHeight 
        : top;
    const actualTooltipBottom = actualTooltipTop + tooltipHeight;
    
    // Ensure tooltip fits vertically - CRITICAL: Always keep entire tooltip visible
    // For step 1, NEVER move it above - always keep it below with small spacing
    if (stepId === 'number-of-images') {
      // Step 1: Always keep below, never move above
      // Ensure minimum spacing of 20px from the element (right below it)
      // Recalculate actual bounds with current finalTop
      const recalculatedTop = finalIsCenteredY 
        ? finalTop - tooltipHeight / 2 
        : finalIsAbove 
          ? finalTop - tooltipHeight 
          : finalTop;
      const recalculatedBottom = recalculatedTop + tooltipHeight;
      
      if (recalculatedTop < padding) {
        // If tooltip is too high, move it down but keep it below the element
        finalTop = rect.bottom + 20;
        transform = 'translateX(-50%)';
      } else if (recalculatedBottom > viewportHeight - padding) {
        // If tooltip goes off bottom, adjust to ensure it's fully visible
        // Calculate the maximum top position that keeps the entire tooltip visible
        const maxTop = viewportHeight - padding - tooltipHeight;
        // But don't go above the element (keep minimum spacing)
        finalTop = Math.max(rect.bottom + 20, Math.min(finalTop, maxTop));
        transform = 'translateX(-50%)';
        // Final safety check - ensure tooltip is fully within viewport
        const finalRecalculatedTop = finalTop;
        const finalRecalculatedBottom = finalRecalculatedTop + tooltipHeight;
        if (finalRecalculatedBottom > viewportHeight - padding) {
          finalTop = viewportHeight - padding - tooltipHeight;
        }
        if (finalRecalculatedTop < padding) {
          finalTop = padding;
        }
      } else {
        // Ensure we maintain minimum spacing
        if (finalTop < rect.bottom + 20) {
          finalTop = rect.bottom + 20;
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
    
    const finalIsCenteredX = transform.includes('translateX(-50%)') || transform.includes('translate(-50%');
    let finalLeft;
    
    // For step 2, preserve left positioning and ensure no overlap
    if (stepId === 'upload' && transform.includes('translate(-100%, -50%)')) {
      // Step 2: Keep on left side, but ensure no overlap with element
      // With translate(-100%, -50%), the tooltip's right edge is at 'left'
      // We need: left (tooltip right edge) < rect.left - 30 (minimum spacing)
      const minGap = 40; // Increased gap to ensure no overlap
      finalLeft = Math.max(padding, left);
      
      // CRITICAL: Verify no overlap - tooltip's right edge must be at least minGap pixels from element's left edge
      // With translate(-100%, -50%), the tooltip's right edge is at 'finalLeft'
      // So we need: finalLeft < rect.left - minGap
      if (finalLeft >= rect.left - minGap) {
        // Would overlap, move further left
        finalLeft = rect.left - minGap - tooltipWidth;
        // If that would go off screen, we need to position it differently
        if (finalLeft < padding) {
          // Not enough space on left - position below the element instead
          // We'll need to update the transform, but for now ensure it's at least at padding
          // The transform will be handled by the vertical positioning logic
          finalLeft = padding;
        }
      }
      
      // Double-check: recalculate tooltip bounds and verify no overlap
      const tooltipRightEdge = finalLeft; // With translate(-100%, -50%), right edge is at finalLeft
      const tooltipLeftEdge = finalLeft - tooltipWidth;
      if (tooltipRightEdge >= rect.left - minGap || tooltipLeftEdge < padding) {
        // Still overlapping or off screen - force position below
        // This will be handled by checking if we need to change transform
        finalLeft = rect.left + rect.width / 2; // Center below element
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
      const minTopToAvoidOverlap = rect.bottom + 12; // Minimum spacing from element
      
      // Aggressively check and fix bottom cutoff
      if (finalActualBottom > viewportHeight - safePadding) {
        // Tooltip goes off bottom - calculate exact position to keep it fully visible
        const targetBottom = viewportHeight - safePadding;
        const targetTop = targetBottom - actualRenderedHeight;
        // But don't go above the element
        boundedTop = Math.max(minTopToAvoidOverlap, targetTop);
        
        // Double-check: recalculate with new boundedTop
        const recalcActualTop = boundedTop;
        const recalcActualBottom = recalcActualTop + actualRenderedHeight;
        if (recalcActualBottom > viewportHeight - safePadding) {
          // Still doesn't fit - position at absolute bottom
          boundedTop = viewportHeight - safePadding - actualRenderedHeight;
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
      // For step 2, tooltip is on the left side (horizontally offset), so no vertical overlap
      // Just ensure it's within viewport vertically
      if (finalActualTop < safePadding) {
        // For centered tooltip, adjust the center point
        if (finalIsCenteredYCheck) {
          boundedTop = safePadding + actualRenderedHeight / 2;
        } else {
          boundedTop = safePadding;
        }
      } else if (finalActualBottom > viewportHeight - safePadding) {
        // For centered tooltip, adjust the center point
        if (finalIsCenteredYCheck) {
          boundedTop = viewportHeight - safePadding - actualRenderedHeight / 2;
        } else {
          boundedTop = viewportHeight - safePadding - actualRenderedHeight;
        }
        // Double-check it's not too high
        const recalcActualTop = finalIsCenteredYCheck 
          ? boundedTop - actualRenderedHeight / 2 
          : boundedTop;
        if (recalcActualTop < safePadding) {
          if (finalIsCenteredYCheck) {
            boundedTop = safePadding + actualRenderedHeight / 2;
          } else {
            boundedTop = safePadding;
          }
        }
      }
      // Don't adjust if it's already within bounds - preserve the left-side positioning
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
    const currentViewportWidth = window.innerWidth;
    
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
    const bottomPadding = safePadding + 10; // Extra padding to ensure buttons are visible
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
          const minTopToAvoidOverlap = rect.bottom + 12;
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
      
      // Adjust boundedTop to achieve targetTop
      if (finalIsCenteredYCheck) {
        boundedTop = targetTop + finalTooltipHeight / 2;
      } else if (finalIsAboveCheck) {
        boundedTop = targetTop + finalTooltipHeight;
      } else {
        boundedTop = targetTop;
      }
      
      // Recalculate absolute positions
      absoluteTop = finalIsCenteredYCheck 
        ? boundedTop - finalTooltipHeight / 2 
        : finalIsAboveCheck 
          ? boundedTop - finalTooltipHeight 
          : boundedTop;
      absoluteBottom = absoluteTop + finalTooltipHeight;
      
      // If still doesn't fit (shouldn't happen, but double-check)
      if (absoluteBottom > currentViewportHeight - bottomPadding) {
        // Force it to fit by adjusting boundedTop directly
        boundedTop = currentViewportHeight - bottomPadding - finalTooltipHeight;
        if (finalIsCenteredYCheck) {
          boundedTop = currentViewportHeight - bottomPadding - finalTooltipHeight / 2;
        } else if (finalIsAboveCheck) {
          boundedTop = currentViewportHeight - bottomPadding - finalTooltipHeight;
        }
      }
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
    
    // Get actual tooltip dimensions from DOM if available
    const actualTooltipWidth = overlayRef.current 
      ? overlayRef.current.offsetWidth || tooltipWidth
      : tooltipWidth;
    
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
        // Step 2: Try to move further left, or position below
        if (rect.left - minGap - actualTooltipWidth >= padding) {
          // Can fit on left with more spacing
          finalLeft = rect.left - minGap - actualTooltipWidth;
          transform = 'translate(-100%, -50%)';
        } else {
          // Not enough space on left - position below
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
        boundedTop = rect.bottom + 30;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      } else {
        // Other steps: position below
        boundedTop = rect.bottom + 30;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
    } else if (overlapsHorizontally && overlapsVertically) {
      // Overlapping both horizontally and vertically - FORCE position below
      boundedTop = rect.bottom + 30;
      finalLeft = rect.left + rect.width / 2;
      transform = 'translateX(-50%)';
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
        const minTopToAvoidOverlap = rect.bottom + 12;
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
      // Overlapping both horizontally and vertically - position below element
      boundedTop = rect.bottom + overlapBuffer;
      finalLeft = rect.left + rect.width / 2;
      transform = 'translateX(-50%)';
      
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
      // Overlapping vertically - move further away
      if (stepId === 'number-of-images') {
        // Step 1: Ensure it's below with proper spacing
        boundedTop = rect.bottom + overlapBuffer;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      } else {
        // Other steps: position below
        boundedTop = rect.bottom + overlapBuffer;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
      
      // Recalculate bounds
      tooltipFinalBounds.top = boundedTop;
      tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight;
      tooltipFinalBounds.left = finalLeft - actualTooltipWidth / 2;
      tooltipFinalBounds.right = finalLeft + actualTooltipWidth / 2;
    }
    
    // Double-check: verify no overlap after repositioning
    const finalOverlapsH = !(tooltipFinalBounds.right < rect.left - overlapBuffer || tooltipFinalBounds.left > rect.right + overlapBuffer);
    const finalOverlapsV = !(tooltipFinalBounds.bottom < rect.top - overlapBuffer || tooltipFinalBounds.top > rect.bottom + overlapBuffer);
    
    if (finalOverlapsH || finalOverlapsV) {
      // Still overlapping - FORCE position below with extra spacing
      boundedTop = rect.bottom + overlapBuffer + 20; // Extra spacing
      finalLeft = rect.left + rect.width / 2;
      transform = 'translateX(-50%)';
      
      // Recalculate one more time to verify
      tooltipFinalBounds.top = boundedTop;
      tooltipFinalBounds.bottom = boundedTop + finalTooltipHeight;
      tooltipFinalBounds.left = finalLeft - actualTooltipWidth / 2;
      tooltipFinalBounds.right = finalLeft + actualTooltipWidth / 2;
      
      // If STILL overlapping, move even further down
      const stillOverlaps = !(tooltipFinalBounds.right < rect.left - overlapBuffer || tooltipFinalBounds.left > rect.right + overlapBuffer) ||
                           !(tooltipFinalBounds.bottom < rect.top - overlapBuffer || tooltipFinalBounds.top > rect.bottom + overlapBuffer);
      if (stillOverlaps) {
        boundedTop = rect.bottom + overlapBuffer + 40; // Even more spacing
      }
    }
    
    // FINAL ABSOLUTE CHECK: For step 2, ALWAYS verify no overlap and FORCE below if needed
    if (stepId === 'upload') {
      // Recalculate tooltip bounds one final time
      let finalTooltipTop = boundedTop;
      let finalTooltipBottom = boundedTop + finalTooltipHeight;
      let finalTooltipLeft = finalLeft - actualTooltipWidth / 2;
      let finalTooltipRight = finalLeft + actualTooltipWidth / 2;
      
      if (transform.includes('translate(-100%')) {
        // Left positioning - recalculate bounds
        finalTooltipRight = finalLeft;
        finalTooltipLeft = finalLeft - actualTooltipWidth;
        finalTooltipTop = boundedTop - finalTooltipHeight / 2;
        finalTooltipBottom = boundedTop + finalTooltipHeight / 2;
      }
      
      // Check for ANY overlap with element
      const strictBuffer = 50; // Very strict buffer
      const overlapsH = !(finalTooltipRight < rect.left - strictBuffer || finalTooltipLeft > rect.right + strictBuffer);
      const overlapsV = !(finalTooltipBottom < rect.top - strictBuffer || finalTooltipTop > rect.bottom + strictBuffer);
      
      // If ANY overlap detected, FORCE position below
      if (overlapsH || overlapsV || overlapsH && overlapsV) {
        boundedTop = rect.bottom + strictBuffer;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
        
        // Recalculate one more time
        finalTooltipTop = boundedTop;
        finalTooltipBottom = boundedTop + finalTooltipHeight;
        finalTooltipLeft = finalLeft - actualTooltipWidth / 2;
        finalTooltipRight = finalLeft + actualTooltipWidth / 2;
        
        // If STILL overlapping, move even further down
        const stillOverlaps = !(finalTooltipRight < rect.left - strictBuffer || finalTooltipLeft > rect.right + strictBuffer) ||
                             !(finalTooltipBottom < rect.top - strictBuffer || finalTooltipTop > rect.bottom + strictBuffer);
        if (stillOverlaps) {
          boundedTop = rect.bottom + strictBuffer + 30;
        }
      }
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
        // Step 2: ALWAYS maintain spacing from element, even if it means going off viewport
        // Overlap prevention is more important than viewport bounds
        const minTopToAvoidOverlap = rect.bottom + overlapBuffer + 20; // Extra spacing
        boundedTop = Math.max(minTopToAvoidOverlap, forcedMaxTop);
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
    
    // ABSOLUTE FINAL CHECK FOR STEP 2: Right before returning, verify no overlap
    // This is the last chance to prevent covering the drag and drop box
    if (stepId === 'upload') {
      // Calculate final tooltip bounds
      let checkTop = boundedTop;
      let checkBottom = boundedTop + finalTooltipHeight;
      let checkLeft = finalLeft - actualTooltipWidth / 2;
      let checkRight = finalLeft + actualTooltipWidth / 2;
      
      if (transform.includes('translate(-100%')) {
        checkRight = finalLeft;
        checkLeft = finalLeft - actualTooltipWidth;
        checkTop = boundedTop - finalTooltipHeight / 2;
        checkBottom = boundedTop + finalTooltipHeight / 2;
      }
      
      // Check for overlap with a very strict buffer
      const finalStrictBuffer = 60;
      const hasOverlap = !(checkRight < rect.left - finalStrictBuffer || checkLeft > rect.right + finalStrictBuffer) ||
                        !(checkBottom < rect.top - finalStrictBuffer || checkTop > rect.bottom + finalStrictBuffer);
      
      // If ANY overlap, FORCE position below - this is non-negotiable
      if (hasOverlap) {
        boundedTop = rect.bottom + finalStrictBuffer;
        finalLeft = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
      }
    }
    
    return {
      position: 'fixed',
      top: `${boundedTop}px`,
      left: `${finalLeft}px`,
      transform,
      zIndex: 100000,
      maxWidth: `${maxTooltipWidth}px`,
      maxHeight: `${maxTooltipHeight}px`,
      width: 'auto'
    };
  };

  // Find target element for current step
  useEffect(() => {
    if (isCompleted || isSkipped || !currentStepData?.targetSelector) {
      setTargetElement(null);
      setHighlightStyle({});
      return;
    }

    // Wait for DOM to be ready and element to be fully rendered
    const findElement = () => {
      try {
        const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
        if (element) {
          // Verify element is actually visible and has dimensions
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log('[HelpOnboarding] Found target element:', {
              selector: currentStepData.targetSelector,
              element: element,
              rect: rect,
              className: element.className,
              textContent: element.textContent?.trim()
            });
            setTargetElement(element);
            return true;
          } else {
            // Element exists but not yet rendered, try again
            console.log('[HelpOnboarding] Element found but not yet rendered, retrying...');
            return false;
          }
        } else {
          console.warn('[HelpOnboarding] Target element not found:', currentStepData.targetSelector);
          return false;
        }
      } catch (error) {
        console.warn('[HelpOnboarding] Failed to find target element:', error);
        return false;
      }
    };

    // Try immediately
    if (!findElement()) {
      // If not found, try after a short delay (for elements that render later)
      const timeoutId = setTimeout(() => {
        if (!findElement()) {
          // Try one more time after a longer delay
          setTimeout(() => {
            findElement();
          }, 100);
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, currentStepData, isCompleted, isSkipped]);

  // Update highlight position and size when target element changes or resizes
  useEffect(() => {
    if (!targetElement) {
      setHighlightStyle({});
      return;
    }

    const stepId = currentStepData?.id;
    const isStep1 = stepId === 'number-of-images';
    const isStep2 = stepId === 'upload';
    
    // Check if we're returning to step 1 from another step OR if cache already exists
    // This includes: returning from another step, page refresh, or clicking Help again
    const hasCache = isStep1 && step1HighlightCache;
    const isReturningToStep1 = hasCache && lastStepId !== null && lastStepId !== 'number-of-images';
    const isInitialStep1WithCache = hasCache && lastStepId === null; // First time seeing step 1 but cache exists (page refresh or Help clicked)
    
    // For step 1, ALWAYS use cached position if it exists and is valid (returning, refresh, or Help clicked)
    // But allow updates on window resize for responsiveness
    // IMPORTANT: Set cache flag BEFORE any observers are set up to prevent them from firing
    if (isReturningToStep1 || isInitialStep1WithCache) {
      // Set flag FIRST (synchronously) before any async operations
      shouldUseStep1Cache = true;
      shouldUseCacheRef.current = true; // Also update ref for observer callbacks
      // Use cached position immediately - this is the EXACT position from first calculation
      // This restores the exact position from initial page load, refresh, or Help click
      setHighlightStyle(step1HighlightCache);
    } else if (!isStep1) {
      // Clear flag when leaving step 1
      shouldUseStep1Cache = false;
      shouldUseCacheRef.current = false;
    } else if (isStep1 && !step1HighlightCache) {
      // On initial load of step 1 without cache, don't use cache (let it calculate and cache)
      shouldUseStep1Cache = false;
      shouldUseCacheRef.current = false;
    }
    
    // Update last step ID
    lastStepId = stepId;

    const updateHighlight = (forceUpdate = false) => {
      // Verify element still exists and is in the DOM
      if (!targetElement || !document.contains(targetElement)) {
        return;
      }
      
      // For step 1, if we have a cache and should use it (and not forcing update),
      // use the cached position instead of recalculating
      // This prevents observers from overwriting the cached position when returning to step 1
      // However, on window resize (forceUpdate=true) OR when cache flag is cleared, we ALWAYS recalculate
      // CRITICAL: When forceUpdate=true OR cache flag is cleared, we MUST skip cache and recalculate
      if (isStep1 && step1HighlightCache && !forceUpdate) {
        // Only use cache if BOTH conditions are true:
        // 1. We're not forcing an update (not resizing)
        // 2. Cache flag is set (we're returning to step 1, not resizing)
        if (shouldUseStep1Cache || shouldUseCacheRef.current) {
          setHighlightStyle(step1HighlightCache);
          return;
        }
        // If cache flag is NOT set (e.g., during resize), DON'T use cache - recalculate instead
        // This ensures responsiveness during window resize
      }
      
      // If we reach here, either:
      // 1. forceUpdate=true (window resize) - recalculate
      // 2. Cache flag is cleared (during resize) - recalculate
      // 3. No cache exists - recalculate
      // Proceed to recalculate with current element position
      
      // If we're on step 1 but no cache exists yet, or if forceUpdate=true (window resize),
      // proceed with calculation to create/update cache

      const rect = targetElement.getBoundingClientRect();
      
      // Skip if element has no dimensions (not yet rendered)
      if (rect.width === 0 && rect.height === 0) {
        return;
      }
      
      // For step 1, ensure element is actually positioned (not at 0,0 which indicates not ready)
      if (isStep1 && rect.top === 0 && rect.left === 0) {
        // Element might not be positioned yet, skip this update
        return;
      }

      // For step 1 (number-of-images), ensure we're highlighting just the button container
      // Use FIXED values to ensure consistent positioning every time
      let padding = 0;
      let topOffset = 0; // Additional offset for top alignment
      let heightAdjustment = 0; // Additional adjustment for height
      
      if (isStep1) {
        // FIXED values - these should NEVER change to ensure consistent positioning
        padding = 6; // Even padding on all sides for perfect centering
        topOffset = -20; // Negative value moves highlight up (adjusted to prevent cutting off top)
        heightAdjustment = 4; // Positive value makes the box taller at both top and bottom
        
        // Calculate highlight position using the element's bounding rect
        // This should be consistent every time as long as the element position is stable
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
          zIndex: 99999
        };
        
        // Cache this position for step 1 in module-level variable so it persists across remounts
        // CRITICAL: Only cache on FIRST calculation - NEVER overwrite once set
        // On resize, we recalculate position for responsiveness but DON'T update cache
        // This ensures when returning to step 1, it uses the original position from first page load
        if (!step1HighlightCache) {
          step1HighlightCache = highlightStyleValue;
          console.log('[HelpOnboarding] ✅ Cached step 1 highlight position (original, never overwritten):', highlightStyleValue);
        }
        // Always update the display with current calculated position (for responsiveness)
        // But cache remains at original position for when returning to step 1
        setHighlightStyle(highlightStyleValue);
        return; // Early return for step 1 to avoid any other adjustments
      }
      
      // For other steps, use normal calculation
      setHighlightStyle({
        position: 'fixed',
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + (padding * 2)}px`,
        height: `${rect.height + (padding * 2)}px`,
        zIndex: 99999
      });
    };

    // Use requestAnimationFrame to ensure DOM is fully updated
    // For step 2, calculate immediately to avoid delay/glitch
    const initialUpdate = () => {
      // If returning to step 1 OR if cache exists (refresh/Help), skip initial update
      // We already set the cached position, don't recalculate
      if ((isReturningToStep1 || isInitialStep1WithCache) && step1HighlightCache) {
        return;
      }
      
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
                      requestAnimationFrame(updateHighlight);
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
      // For step 1, if we're using cache (returning to step 1), skip ResizeObserver
      // ResizeObserver can fire when element becomes visible, which we don't want to recalculate
      // But if window is being resized, handleResize will handle it
      if (isStep1 && shouldUseCacheRef.current) {
        // Skip ResizeObserver updates when using cache (only window resize should update)
        return;
      }
      // For other cases or when not using cache, update immediately
      updateHighlight();
    });

    if (targetElement) {
      resizeObserver.observe(targetElement);
      // Only observe document body for non-step1 or when not using cache
      // For step 1 with cache, document.body observer can fire when returning to step 1
      // and cause unwanted recalculations
      if (document.body && (!isStep1 || !shouldUseCacheRef.current)) {
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
      // On window resize, ALWAYS clear cache flag to allow recalculation
      // This makes the highlight responsive and follow the element
      if (isStep1) {
        // Clear cache flag to allow recalculation (for responsiveness)
        shouldUseStep1Cache = false;
        shouldUseCacheRef.current = false;
      }
      
      // Update IMMEDIATELY with no delay for maximum responsiveness
      // Recalculate highlight on resize to follow element position
      // For step 1, it will use the same fixed offset values but recalculate based on new element position
      // The cache is NOT updated - it remains at the original position
      updateHighlight(true); // Force update on window resize - this bypasses all cache checks
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
      // Update immediately with no delay for maximum responsiveness
      const style = getOverlayStyle();
      setTooltipStyle(style);
    };

    // Initial position
    updatePosition();
    
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
  }, [targetElement, currentStep, isCompleted, isSkipped, currentStepData]);

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

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="onboarding-backdrop"
        onClick={handleSkip}
      />

      {/* Highlight overlay for target element */}
      {targetElement && Object.keys(highlightStyle).length > 0 && (
        <div
          className="onboarding-highlight"
          style={highlightStyle}
        />
      )}

      {/* Tooltip/Instruction box */}
      <div
        ref={overlayRef}
        className="onboarding-tooltip"
        style={tooltipStyle}
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
