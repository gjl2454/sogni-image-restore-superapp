/**
 * Video Generation Settings
 */

export const VIDEO_MODELS = {
  speed: 'wan_v2.2-14b-fp8_i2v_lightx2v',
  quality: 'wan_v2.2-14b-fp8_i2v'
} as const;

export const VIDEO_QUALITY_PRESETS = {
  fast: {
    model: VIDEO_MODELS.speed,
    steps: 4,
    label: 'Fast',
    description: 'Quick generation (~12-20s)'
  }
} as const;

export type VideoQualityPreset = keyof typeof VIDEO_QUALITY_PRESETS;

export const VIDEO_CONFIG = {
  defaultFrames: 81, // 5 seconds at 16fps
  defaultFps: 16,
  defaultDuration: 5,
  dimensionDivisor: 16
};

export function calculateVideoDimensions(
  imageWidth: number,
  imageHeight: number,
  targetResolution: number = 480
): { width: number; height: number } {
  const divisor = VIDEO_CONFIG.dimensionDivisor;
  const roundedTarget = Math.round(targetResolution / divisor) * divisor;
  const isWidthShorter = imageWidth <= imageHeight;
  
  if (isWidthShorter) {
    const width = roundedTarget;
    const height = Math.round((imageHeight * roundedTarget / imageWidth) / divisor) * divisor;
    return { width, height };
  } else {
    const height = roundedTarget;
    const width = Math.round((imageWidth * roundedTarget / imageHeight) / divisor) * divisor;
    return { width, height };
  }
}

export function calculateVideoFrames(duration: number = VIDEO_CONFIG.defaultDuration): number {
  return 16 * duration + 1;
}






