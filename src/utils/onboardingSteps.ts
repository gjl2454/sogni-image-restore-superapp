/**
 * Onboarding Step Definitions
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'number-of-images',
    title: 'Choose Number of Results',
    description: 'Select how many restored variations you want to generate. More images give you more options to choose from.',
    targetSelector: '[data-onboarding="number-of-images"]',
    position: 'bottom'
  },
  {
    id: 'upload',
    title: 'Upload Your Photo',
    description: 'Click here to upload a photo you want to restore. You can drag and drop an image or click to browse. Restoration will start automatically!',
    targetSelector: '[data-onboarding="upload-zone"]',
    position: 'bottom'
  },
  {
    id: 'restore',
    title: 'Restoration in Progress',
    description: 'Your photo is being restored automatically! The AI will enhance your image and generate the variations you selected. This usually takes just a few moments.',
    targetSelector: '[data-onboarding="restore-button"]',
    position: 'top'
  },
  {
    id: 'results',
    title: 'View & Download Results',
    description: 'Once restoration is complete, you can view all results, compare before/after, and download your favorites.',
    targetSelector: '[data-onboarding="results"]',
    position: 'top'
  }
];
