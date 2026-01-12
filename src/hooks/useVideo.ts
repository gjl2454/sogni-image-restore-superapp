import { useState, useCallback } from 'react';
import { SogniClient } from '@sogni-ai/sogni-client';
import { generateVideo } from '../services/videoService';
import { TokenType } from '../types/wallet';

interface UseVideoResult {
  isGenerating: boolean;
  progress: number;
  error: string | null;
  videoUrl: string | null;
  generate: (client: SogniClient, imageUrl: string, width: number, height: number, tokenType: TokenType) => Promise<void>;
  reset: () => void;
}

export function useVideo(): UseVideoResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const generate = useCallback(async (
    client: SogniClient,
    imageUrl: string,
    width: number,
    height: number,
    tokenType: TokenType
  ) => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setVideoUrl(null);

    try {
      const resultUrl = await generateVideo(
        client,
        { imageUrl, width, height, tokenType },
        (progressUpdate) => {
          if (progressUpdate.progress !== undefined) {
            setProgress(progressUpdate.progress);
          }
        }
      );

      setVideoUrl(resultUrl);
      setProgress(1);
    } catch (err: any) {
      console.error('[VIDEO] Generation failed:', err);
      
      if (err.isInsufficientCredits || err.message === 'INSUFFICIENT_CREDITS') {
        setError('INSUFFICIENT_CREDITS');
      } else {
        setError(err.message || 'Video generation failed. Please try again.');
      }
      
      // Re-throw so callers know the operation failed
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setError(null);
    setVideoUrl(null);
  }, []);

  return {
    isGenerating,
    progress,
    error,
    videoUrl,
    generate,
    reset
  };
}






