/**
 * Frontend Analytics Service
 * Handles tracking of restoration, download, share, and video generation events
 * Infrastructure only - Google Analytics integration to be added later
 */

/**
 * Get the API base URL based on environment
 */
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'http://localhost:3001';
    }
    
    // Local SSL development (restoration-local.sogni.ai)
    if (hostname.includes('restoration-local.sogni.ai')) {
      return 'https://restoration-api-local.sogni.ai';
    }
    
    // Production
    return 'https://restoration-api.sogni.ai';
  }
  return 'http://localhost:3001';
};

/**
 * Analytics event types
 */
export type AnalyticsEventType = 
  | 'restoration_started'
  | 'restoration_completed'
  | 'restoration_failed'
  | 'download'
  | 'share'
  | 'video_generation_started'
  | 'video_generation_completed'
  | 'video_generation_failed';

/**
 * Analytics event interface
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Local storage for analytics events (for now)
 * In the future, these will be sent to Google Analytics
 */
const MAX_LOCAL_EVENTS = 1000;
const STORAGE_KEY = 'sogni_restoration_analytics_events';

/**
 * Get stored events from localStorage
 */
function getStoredEvents(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('[Analytics] Failed to read stored events:', error);
  }
  return [];
}

/**
 * Store events in localStorage
 */
function storeEvent(event: AnalyticsEvent): void {
  try {
    const events = getStoredEvents();
    events.push(event);
    
    // Keep only the most recent events
    if (events.length > MAX_LOCAL_EVENTS) {
      events.splice(0, events.length - MAX_LOCAL_EVENTS);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn('[Analytics] Failed to store event:', error);
  }
}

/**
 * Track a restoration started event
 */
export const trackRestorationStarted = async (metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'restoration_started',
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'restoration_started', { ...metadata });
  
  console.log('[Analytics] Restoration started:', metadata);
};

/**
 * Track a restoration completed event
 */
export const trackRestorationCompleted = async (metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'restoration_completed',
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'restoration_completed', { ...metadata });
  
  console.log('[Analytics] Restoration completed:', metadata);
};

/**
 * Track a restoration failed event
 */
export const trackRestorationFailed = async (error: string, metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'restoration_failed',
    timestamp: Date.now(),
    metadata: {
      error,
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'restoration_failed', { error, ...metadata });
  
  console.log('[Analytics] Restoration failed:', error, metadata);
};

/**
 * Track a download event
 */
export const trackDownload = async (metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'download',
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'download', { ...metadata });
  
  console.log('[Analytics] Download tracked:', metadata);
};

/**
 * Track a share event
 */
export const trackShare = async (shareType: string = 'unknown', metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'share',
    timestamp: Date.now(),
    metadata: {
      shareType,
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'share', { shareType, ...metadata });
  
  console.log('[Analytics] Share tracked:', shareType, metadata);
};

/**
 * Track a video generation started event
 */
export const trackVideoGenerationStarted = async (metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'video_generation_started',
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'video_generation_started', { ...metadata });
  
  console.log('[Analytics] Video generation started:', metadata);
};

/**
 * Track a video generation completed event
 */
export const trackVideoGenerationCompleted = async (metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'video_generation_completed',
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'video_generation_completed', { ...metadata });
  
  console.log('[Analytics] Video generation completed:', metadata);
};

/**
 * Track a video generation failed event
 */
export const trackVideoGenerationFailed = async (error: string, metadata: Record<string, any> = {}) => {
  const event: AnalyticsEvent = {
    type: 'video_generation_failed',
    timestamp: Date.now(),
    metadata: {
      error,
      ...metadata,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
  };
  
  storeEvent(event);
  
  // TODO: Send to Google Analytics when integrated
  // gtag('event', 'video_generation_failed', { error, ...metadata });
  
  console.log('[Analytics] Video generation failed:', error, metadata);
};

/**
 * Get all stored events (for debugging)
 */
export const getStoredAnalyticsEvents = (): AnalyticsEvent[] => {
  return getStoredEvents();
};

/**
 * Clear all stored events
 */
export const clearStoredAnalyticsEvents = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Analytics] Cleared stored events');
  } catch (error) {
    console.warn('[Analytics] Failed to clear stored events:', error);
  }
};

// Export for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).analyticsService = {
    trackRestorationStarted,
    trackRestorationCompleted,
    trackRestorationFailed,
    trackDownload,
    trackShare,
    trackVideoGenerationStarted,
    trackVideoGenerationCompleted,
    trackVideoGenerationFailed,
    getStoredAnalyticsEvents,
    clearStoredAnalyticsEvents
  };
}
