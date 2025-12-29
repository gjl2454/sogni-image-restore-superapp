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
 */
export async function restorePhoto(
  sogniClient: SogniClient,
  params: RestorationParams,
  onProgress?: (progress: RestorationProgress) => void
): Promise<string> {
  const {
    imageData,
    width,
    height,
    tokenType,
    customPrompt,
    outputFormat = 'jpg'
  } = params;

  const prompt = customPrompt || 'Restore and repair this damaged photograph, remove scratches, tears, stains, and age-related damage, enhance details and colors while preserving the original character';

  // Create project with Flux Kontext model
  const projectConfig = {
    type: 'image' as const,
    testnet: false,
    tokenType: tokenType,
    modelId: 'flux1-dev-kontext_fp8_scaled',
    positivePrompt: prompt,
    sizePreset: 'custom' as const,
    width,
    height,
    steps: 24,
    guidance: 5.5,
    numberOfMedia: 1,
    outputFormat,
    sensitiveContentFilter: false, // Kontext model is not NSFW-aware
    contextImages: [imageData], // Kontext uses contextImages array
    sourceType: 'enhancement-kontext'
  };

  console.log('[RESTORE] Creating restoration project with Flux Kontext');

  const project = await sogniClient.projects.create(projectConfig);

  console.log(`[RESTORE] Project created: ${project.id}`);

  return new Promise((resolve, reject) => {
    let resolved = false;
    let timeoutId: NodeJS.Timeout;

    // Listen to job events
    project.on('job', (event) => {
      const { type, jobId, progress } = event;
      
      console.log(`[RESTORE] Job event:`, { type, jobId, progress });
      
      if (onProgress && type === 'progress' && progress !== undefined) {
        const progressValue = typeof progress === 'number' ? progress : 0;
        // Normalize progress to 0-1 range (SDK can send 0-1 or 0-100)
        const normalizedProgress = progressValue > 1 ? progressValue / 100 : progressValue;
        onProgress({
          type: 'progress',
          jobId,
          progress: normalizedProgress
        });
      }
    });

    // Listen to project-level progress events
    project.on('progress', (progress) => {
      const progressValue = typeof progress === 'number' ? progress : 
        (typeof progress === 'object' && (progress as any).progress !== undefined) ? (progress as any).progress : 0;
      
      // Normalize progress to 0-1 range (SDK can send 0-1 or 0-100)
      const normalizedProgress = progressValue > 1 ? progressValue / 100 : progressValue;
      
      console.log(`[RESTORE] Project progress: ${Math.floor(normalizedProgress * 100)}%`);
      
      if (onProgress) {
        onProgress({
          type: 'progress',
          progress: normalizedProgress
        });
      }
    });

    // Listen to jobCompleted event
    project.on('jobCompleted', (job: any) => {
      console.log('[RESTORE] Job completed:', job);
      
      if (job.resultUrl && !resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(job.resultUrl);
      }
    });

    // Listen to jobFailed event
    project.on('jobFailed', (job: any) => {
      console.error('[RESTORE] Job failed:', job);
      
      if (!resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        
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
    });

    // Timeout fallback
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Restoration timed out'));
      }
    }, 300000); // 5 minutes
  });
}

