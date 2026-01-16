/**
 * Credits Service
 * Provides cost estimation and credit tracking for restoration operations
 */

/**
 * Credit cost constants (in credits)
 * Based on actual Sogni API costs - verified from user account
 * 4 images = 20.59 credits total, so ~5.15 credits per image
 */
export const CREDIT_COSTS = {
  /** Cost per image restoration (5.1475 credits per image, rounded to 5.15) */
  RESTORATION_PER_IMAGE: 5.15,
  /** Cost per video generation */
  VIDEO_GENERATION: 5
} as const;

/**
 * Estimate credit cost for a restoration operation
 * @param numberOfImages - Number of images to restore
 * @returns Estimated cost in credits (rounded to 2 decimal places for accuracy)
 */
export function estimateRestorationCost(numberOfImages: number): number {
  // Calculate cost: 5.15 credits per image
  // For 4 images: 5.15 × 4 = 20.6 credits (actual cost is ~20.59)
  const total = numberOfImages * CREDIT_COSTS.RESTORATION_PER_IMAGE;
  // Round to 2 decimal places for accuracy
  return Math.round(total * 100) / 100;
}

/**
 * Estimate credit cost for video generation
 * @returns Estimated cost in credits
 */
export function estimateVideoCost(): number {
  return CREDIT_COSTS.VIDEO_GENERATION;
}

/**
 * Format credits for display
 * @param credits - Number of credits
 * @param showDecimals - Whether to show decimal places (default: false for balances, true for costs)
 * @returns Formatted string
 */
export function formatCredits(credits: number, showDecimals: boolean = false): string {
  if (credits >= 1000) {
    return `${(credits / 1000).toFixed(1)}k`;
  }
  // Show decimals if requested or if value is less than 10
  if (showDecimals || credits < 10) {
    return credits.toFixed(1);
  }
  return credits.toFixed(0);
}

/**
 * Get credit status color (for UI)
 * @param balance - Current credit balance
 * @param estimatedCost - Estimated cost for operation
 * @returns Color string
 */
export function getCreditStatusColor(balance: number, estimatedCost: number = 0): 'green' | 'yellow' | 'red' {
  const remaining = balance - estimatedCost;
  
  if (remaining < 0) {
    return 'red'; // Out of credits
  } else if (remaining < estimatedCost * 2) {
    return 'yellow'; // Low credits
  } else {
    return 'green'; // Plenty of credits
  }
}
