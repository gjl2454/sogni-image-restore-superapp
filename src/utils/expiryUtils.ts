/**
 * Utility functions for handling image expiry (24-hour limit from Sogni API)
 */

const EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const WARNING_THRESHOLD_MS = 2 * 60 * 60 * 1000; // Warn when < 2 hours remaining

export interface ExpiryInfo {
  expiresAt: number;
  timeRemaining: number;
  isExpired: boolean;
  isExpiringSoon: boolean; // < 2 hours remaining
  formattedTimeRemaining: string;
}

/**
 * Calculate expiry information for an image based on its creation time
 */
export function getExpiryInfo(createdAt: number): ExpiryInfo {
  const now = Date.now();
  const expiresAt = createdAt + EXPIRY_DURATION_MS;
  const timeRemaining = expiresAt - now;
  const isExpired = timeRemaining <= 0;
  const isExpiringSoon = timeRemaining > 0 && timeRemaining <= WARNING_THRESHOLD_MS;

  return {
    expiresAt,
    timeRemaining,
    isExpired,
    isExpiringSoon,
    formattedTimeRemaining: formatTimeRemaining(timeRemaining)
  };
}

/**
 * Format remaining time in human-readable format
 */
export function formatTimeRemaining(timeRemaining: number): string {
  if (timeRemaining <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  } else if (minutes >= 1) {
    return `${minutes}m`;
  } else {
    const seconds = Math.floor(timeRemaining / 1000);
    return `${seconds}s`;
  }
}

/**
 * Get a color code based on time remaining
 */
export function getExpiryColor(timeRemaining: number): string {
  if (timeRemaining <= 0) {
    return '#f44336'; // Red - expired
  } else if (timeRemaining <= WARNING_THRESHOLD_MS) {
    return '#ff9800'; // Orange - expiring soon
  } else {
    return '#4CAF50'; // Green - safe
  }
}

/**
 * Get expiry status text
 */
export function getExpiryStatusText(expiryInfo: ExpiryInfo): string {
  if (expiryInfo.isExpired) {
    return 'Download link expired';
  } else if (expiryInfo.isExpiringSoon) {
    return `Expires in ${expiryInfo.formattedTimeRemaining}`;
  } else {
    return `Available for ${expiryInfo.formattedTimeRemaining}`;
  }
}
