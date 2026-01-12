/**
 * Restoration service using Flux Kontext model
 */
import { SogniClient } from '@sogni-ai/sogni-client';
import { TokenType } from '../types/wallet';

interface RestorationParams {
  imageData: Uint8Array;
  width: number;
  height: number;
  tokenType: TokenType;
  customPrompt?: string;
  outputFormat?: 'jpg' | 'png';
  numberOfMedia?: number;
}

interface RestorationProgress {
  type: string;
  progress?: number;
  jobId?: string;
  resultUrl?: string;
  error?: any;
}

/**
 * Restore a damaged photo using Flux Kontext model
 * Returns 4 variations for user to choose from
 */
export async function restorePhoto(
  sogniClient: SogniClient,
  params: RestorationParams,
  onProgress?: (progress: RestorationProgress) => void
): Promise<string[]> {
  const {
    imageData,
    width,
    height,
    tokenType,
    customPrompt,
    outputFormat = 'jpg',
    numberOfMedia = 4
  } = params;

  const prompt = customPrompt || 'Restore and repair this damaged photograph, remove scratches, tears, stains, and age-related damage, enhance details and colors while preserving the original character';

  // Check websocket connection status
  const apiClient = (sogniClient as any).apiClient;
  const socket = apiClient?.socket;
  
  console.log('[RESTORE SERVICE] Checking client and websocket status...', {
    hasClient: !!sogniClient,
    hasAccount: !!sogniClient?.account,
    hasCurrentAccount: !!sogniClient?.account?.currentAccount,
    // SDK has typo: isAuthenicated (missing 't')
    isAuthenticated: (sogniClient?.account?.currentAccount as any)?.isAuthenicated,
    username: sogniClient?.account?.currentAccount?.username,
    hasProjects: !!sogniClient?.projects,
    hasProjectsCreate: typeof sogniClient?.projects?.create === 'function',
    // Websocket status
    hasApiClient: !!apiClient,
    hasSocket: !!socket,
    // Note: isConnected is a property, not a function in the SDK
    socketConnected: socket?.connected,
    socketReadyState: socket?.socket?.readyState,
    socketUrl: socket?.socket?.url
  });

  // Add global listener to debug ALL events from the client
  const clientEmitter = (sogniClient as any);
  if (clientEmitter && typeof clientEmitter.on === 'function') {
    console.log('[RESTORE SERVICE] Setting up global client event listener...');
    const debugListener = (event: string, ...args: any[]) => {
      console.log(`[RESTORE SERVICE] Client event: ${event}`, args);
    };
    // Try to listen to all events if possible
    if (clientEmitter.onAny) {
      clientEmitter.onAny(debugListener);
    }
  }

  // Also listen to socket events directly
  if (socket && typeof socket.on === 'function') {
    console.log('[RESTORE SERVICE] Setting up socket event listeners...');
    ['jobState', 'jobProgress', 'jobError', 'jobResult', 'jobETA'].forEach(eventName => {
      socket.on(eventName, (data: any) => {
        console.log(`[RESTORE SERVICE] Socket "${eventName}" event:`, data);
      });
    });
  }

  // Create project with Flux Kontext model
  const projectConfig: any = {
    type: 'image',
    testnet: false,
    tokenType: tokenType,
    modelId: 'flux1-dev-kontext_fp8_scaled',
    positivePrompt: prompt,
    negativePrompt: '',
    stylePrompt: '',
    sizePreset: 'custom',
    width,
    height,
    steps: 24,
    guidance: 5.5,
    numberOfMedia, // Generate specified number of variations for user to choose from
    outputFormat,
    sensitiveContentFilter: false, // Kontext model is not NSFW-aware
    contextImages: [imageData], // Kontext uses contextImages array
    sourceType: 'enhancement-kontext'
  };

  console.log('[RESTORE SERVICE] Creating restoration project with Flux Kontext', {
    config: {
      ...projectConfig,
      contextImages: `[Uint8Array(${imageData.length} bytes)]`
    }
  });

  // Debug: Listen to projects API events
  const projectsApi = sogniClient.projects as any;
  if (projectsApi && typeof projectsApi.on === 'function') {
    console.log('[RESTORE SERVICE] Setting up projectsApi event listeners...');
    ['project'].forEach(eventName => {
      projectsApi.on(eventName, (data: any) => {
        console.log(`[RESTORE SERVICE] ProjectsAPI "${eventName}" event:`, data);
      });
    });
  }

  const startTime = Date.now();
  let project;
  try {
    console.log('[RESTORE SERVICE] Calling sogniClient.projects.create()...');
    project = await sogniClient.projects.create(projectConfig);
    console.log(`[RESTORE SERVICE] Project created successfully in ${Date.now() - startTime}ms:`, {
      projectId: project.id,
      hasOn: typeof project?.on === 'function',
      projectKeys: Object.keys(project || {}),
      projectJobs: project?.jobs?.length,
      projectStatus: project?.status,
      projectProgress: project?.progress
    });

    // List tracked projects
    const trackedProjects = sogniClient.projects.trackedProjects;
    console.log('[RESTORE SERVICE] Tracked projects:', {
      count: trackedProjects?.length,
      ids: trackedProjects?.map((p: any) => p.id)
    });

  } catch (createError: any) {
    console.error('[RESTORE SERVICE] Failed to create project:', {
      error: createError,
      message: createError?.message,
      code: createError?.code,
      stack: createError?.stack
    });
    throw createError;
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    let timeoutId: NodeJS.Timeout;
    let noEventTimeoutId: NodeJS.Timeout;
    const resultUrls: string[] = [];
    const expectedResults = numberOfMedia;
    let lastEventTime = Date.now();
    let eventCount = 0;
    const jobIdSet = new Set<string>(); // Track job IDs we've seen

    console.log('[RESTORE SERVICE] Setting up event listeners (following photobooth pattern)...');

    // Track if we receive ANY events within 10 seconds
    noEventTimeoutId = setTimeout(() => {
      if (eventCount === 0 && !resolved) {
        console.error('[RESTORE SERVICE] ⚠️ NO EVENTS RECEIVED after 10 seconds!', {
          projectId: project.id,
          hasOn: typeof project?.on === 'function',
          projectType: typeof project,
          projectConstructor: project?.constructor?.name
        });
      }
    }, 10000);

    // *** KEY FIX: Listen to GLOBAL job events from sogniClient.projects ***
    // This is what the photobooth does in FrontendSogniClientAdapter
    const projectsApi = sogniClient.projects as any;
    
    const globalJobHandler = (event: any) => {
      // Only process events for THIS project
      if (event.projectId !== project.id) {
        return;
      }
      
      eventCount++;
      lastEventTime = Date.now();
      
      console.log(`[RESTORE SERVICE] Global job event #${eventCount}:`, event);
      
      // Track job IDs
      if (event.jobId) {
        jobIdSet.add(event.jobId);
      }
      
      // Handle progress events
      if (event.type === 'progress' && event.step && event.stepCount) {
        const normalizedProgress = event.step / event.stepCount;
        console.log(`[RESTORE SERVICE] Progress: ${(normalizedProgress * 100).toFixed(1)}%`);
        if (onProgress) {
          onProgress({
            type: 'progress',
            jobId: event.jobId,
            progress: normalizedProgress
          });
        }
      }
    };
    
    if (projectsApi && typeof projectsApi.on === 'function') {
      projectsApi.on('job', globalJobHandler);
      console.log('[RESTORE SERVICE] ✓ Registered GLOBAL "job" event listener on sogniClient.projects');
    } else {
      console.warn('[RESTORE SERVICE] ⚠️ Cannot register global job listener - projectsApi.on not available');
    }

    // Also listen to project-level events (as backup)
    const progressHandler = (progress: any) => {
      eventCount++;
      lastEventTime = Date.now();
      const progressValue = typeof progress === 'number' ? progress : 
        (typeof progress === 'object' && (progress as any).progress !== undefined) ? (progress as any).progress : 0;
      
      // Normalize progress to 0-1 range (SDK can send 0-1 or 0-100)
      const normalizedProgress = progressValue > 1 ? progressValue / 100 : progressValue;
      
      console.log(`[RESTORE SERVICE] Project progress event #${eventCount}: ${Math.floor(normalizedProgress * 100)}%`, progress);
      
      if (onProgress) {
        onProgress({
          type: 'progress',
          progress: normalizedProgress
        });
      }
    };
    
    project.on('progress', progressHandler);
    console.log('[RESTORE SERVICE] ✓ Registered project "progress" event listener');

    // Listen to jobCompleted event - collect all results
    const jobCompletedHandler = (job: any) => {
      eventCount++;
      lastEventTime = Date.now();
      console.log(`[RESTORE SERVICE] Job completed event #${eventCount}:`, {
        job,
        hasResultUrl: !!job?.resultUrl,
        resultUrl: job?.resultUrl
      });
      
      if (job.resultUrl && !resolved) {
        resultUrls.push(job.resultUrl);
        console.log(`[RESTORE SERVICE] ✓ Collected ${resultUrls.length}/${expectedResults} results`);
        
        // Once we have all expected results, resolve
        if (resultUrls.length >= expectedResults) {
          resolved = true;
          if (timeoutId) clearTimeout(timeoutId);
          if (noEventTimeoutId) clearTimeout(noEventTimeoutId);
          // Clean up global listener
          if (projectsApi && typeof projectsApi.off === 'function') {
            projectsApi.off('job', globalJobHandler);
          }
          console.log('[RESTORE SERVICE] ✅ All results collected, resolving!');
          resolve(resultUrls);
        }
      }
    };
    
    project.on('jobCompleted', jobCompletedHandler);
    console.log('[RESTORE SERVICE] ✓ Registered "jobCompleted" event listener');

    // Listen to jobFailed event
    const jobFailedHandler = (job: any) => {
      eventCount++;
      lastEventTime = Date.now();
      console.error(`[RESTORE SERVICE] Job failed event #${eventCount}:`, {
        job,
        error: job?.error
      });
      
      if (!resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (noEventTimeoutId) clearTimeout(noEventTimeoutId);
        // Clean up global listener
        if (projectsApi && typeof projectsApi.off === 'function') {
          projectsApi.off('job', globalJobHandler);
        }
        
        const error = job?.error;
        let errorMessage = 'Restoration failed during processing';
        
        // Check for specific error codes
        if (error?.code === 4024 || 
            (error?.message && error.message.toLowerCase().includes('insufficient'))) {
          errorMessage = 'INSUFFICIENT_CREDITS';
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        const restorationError = new Error(errorMessage) as any;
        restorationError.code = error?.code;
        restorationError.isInsufficientCredits = errorMessage === 'INSUFFICIENT_CREDITS';
        reject(restorationError);
      }
    };
    
    project.on('jobFailed', jobFailedHandler);
    console.log('[RESTORE SERVICE] ✓ Registered "jobFailed" event listener');

    // Listen to project failed event
    const projectFailedHandler = (error: any) => {
      eventCount++;
      console.error(`[RESTORE SERVICE] Project "failed" event #${eventCount}:`, error);
      
      if (!resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (noEventTimeoutId) clearTimeout(noEventTimeoutId);
        // Clean up global listener
        if (projectsApi && typeof projectsApi.off === 'function') {
          projectsApi.off('job', globalJobHandler);
        }
        
        const errorMessage = error?.message || 'Restoration failed';
        const restorationError = new Error(errorMessage) as any;
        restorationError.code = error?.code;
        reject(restorationError);
      }
    };
    (project as any).on('failed', projectFailedHandler);
    console.log('[RESTORE SERVICE] ✓ Registered "failed" event listener');

    // Also check the jobs array on the project
    console.log('[RESTORE SERVICE] Project jobs after creation:', {
      jobsCount: project.jobs?.length,
      jobs: project.jobs?.map((j: any) => ({ id: j.id, status: j.status }))
    });

    console.log('[RESTORE SERVICE] All event listeners registered. Waiting for events...', {
      projectId: project.id,
      expectedResults,
      projectStatus: project.status,
      projectProgress: project.progress
    });

    // Timeout fallback
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (noEventTimeoutId) clearTimeout(noEventTimeoutId);
        // Clean up global listener
        if (projectsApi && typeof projectsApi.off === 'function') {
          projectsApi.off('job', globalJobHandler);
        }
        const elapsed = Date.now() - startTime;
        console.error('[RESTORE SERVICE] ❌ Restoration timed out', {
          elapsedMs: elapsed,
          eventCount,
          lastEventTime: lastEventTime ? Date.now() - lastEventTime + 'ms ago' : 'never',
          collectedResults: resultUrls.length,
          expectedResults,
          seenJobIds: Array.from(jobIdSet)
        });
        reject(new Error('Restoration timed out after 5 minutes'));
      }
    }, 300000); // 5 minutes
    
    console.log('[RESTORE SERVICE] Timeout set to 5 minutes');
  });
}

