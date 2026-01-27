/**
 * Onboarding Step Definitions
 *
 * Steps 1 & 2: Highlight specific UI elements
 * Steps 3 & 4: Informational (centered tooltip, no highlight)
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
    description: 'Select how many restored variations to generate. More images give you more options to find the perfect restoration.',
    targetSelector: '[data-onboarding="number-of-images"]',
    position: 'bottom'
  },
  {
    id: 'upload',
    title: 'Upload Your Photo',
    description: 'Drag and drop an image here, or click to browse your files. Restoration begins automatically after upload.',
    targetSelector: '[data-onboarding="upload-zone"]',
    position: 'right'
  },
  {
    id: 'restore',
    title: 'Watch the Magic Happen',
    description: 'Once uploaded, our AI will automatically enhance your photo. You\'ll see a progress indicator while it works its magic.',
    // No targetSelector - this is an informational step
    position: 'center'
  },
  {
    id: 'results',
    title: 'Pick Your Favorite!',
    description: 'Review all restored variations side by side. Use the comparison slider to see before/after, then download your favorites.',
    // No targetSelector - this is an informational step
    position: 'center'
  }
];
