/**
 * Video generation service
 */
import { SogniClient } from '@sogni-ai/sogni-client';
import { TokenType } from '../types/wallet';
import { VIDEO_QUALITY_PRESETS, calculateVideoDimensions, calculateVideoFrames } from '../constants/videoSettings';

interface VideoParams {
  imageUrl: string;
  width: number;
  height: number;
  tokenType: TokenType;
  prompt?: string;
}

interface VideoProgress {
  type: string;
  progress?: number;
  jobId?: string;
  resultUrl?: string;
  error?: any;
}

export async function generateVideo(
  sogniClient: SogniClient,
  params: VideoParams,
  onProgress?: (progress: VideoProgress) => void
): Promise<string> {
  const { imageUrl, width, height, tokenType, prompt = '' } = params;

  // Fetch the image data
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const imageData = new Uint8Array(arrayBuffer);

  // Calculate video dimensions (480p)
  const { width: videoWidth, height: videoHeight } = calculateVideoDimensions(width, height, 480);
  const frames = calculateVideoFrames(5); // 5 second video
  const quality = VIDEO_QUALITY_PRESETS.fast;

  console.log('[VIDEO] Generating with params:', {
    videoWidth,
    videoHeight,
    frames,
    model: quality.model,
    steps: quality.steps
  });

  const projectConfig = {
    type: 'video' as const,
    testnet: false,
    tokenType,
    modelId: quality.model,
    positivePrompt: prompt,
    negativePrompt: '',
    stylePrompt: '',
    width: videoWidth,
    height: videoHeight,
    numberOfMedia: 1,
    sensitiveContentFilter: false,
    referenceImage: imageData as any,
    numberOfFrames: frames,
    fps: 16,
    steps: quality.steps
  };

  const project = await sogniClient.projects.create(projectConfig);
  console.log(`[VIDEO] Project created: ${project.id}`);

  return new Promise((resolve, reject) => {
    let resolved = false;
    let timeoutId: NodeJS.Timeout;

    // Listen to job events
    const jobListener = (event: any) => {
      const { type, jobId, progress } = event;
      
      console.log(`[VIDEO] Job event:`, { type, jobId, progress });
      
      if (onProgress && type === 'progress' && progress !== undefined) {
        const progressValue = typeof progress === 'number' ? progress : 0;
        const normalizedProgress = progressValue > 1 ? progressValue / 100 : progressValue;
        onProgress({
          type: 'progress',
          jobId,
          progress: normalizedProgress
        });
      }
    };
    
    // Attach listener (SDK may have different event names)
    if (typeof (project as any).on === 'function') {
      (project as any).on('job', jobListener);
    }

    // Listen to project-level progress
    project.on('progress', (progress: any) => {
      const progressValue = typeof progress === 'number' ? progress : 
        (typeof progress === 'object' && progress.progress !== undefined) ? progress.progress : 0;
      
      const normalizedProgress = progressValue > 1 ? progressValue / 100 : progressValue;
      
      console.log(`[VIDEO] Project progress: ${Math.floor(normalizedProgress * 100)}%`);
      
      if (onProgress) {
        onProgress({
          type: 'progress',
          progress: normalizedProgress
        });
      }
    });

    // Listen to jobCompleted event
    project.on('jobCompleted', (job: any) => {
      console.log('[VIDEO] Job completed:', job);
      
      if (job.resultUrl && !resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve(job.resultUrl);
      }
    });

    // Listen to jobFailed event
    project.on('jobFailed', (job: any) => {
      console.error('[VIDEO] Job failed:', job);
      
      if (!resolved) {
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        const error = job?.error;
        let errorMessage = 'Video generation failed';
        
        if (error?.code === 4024 || 
            (error?.message && error.message.toLowerCase().includes('insufficient'))) {
          errorMessage = 'INSUFFICIENT_CREDITS';
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        const videoError = new Error(errorMessage) as any;
        videoError.code = error?.code;
        videoError.isInsufficientCredits = errorMessage === 'INSUFFICIENT_CREDITS';
        reject(videoError);
      }
    });

    // Timeout
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Video generation timed out'));
      }
    }, 600000); // 10 minutes
  });
}






