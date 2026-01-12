import React from 'react';

interface Feature {
  icon: React.ReactNode;
  heading: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Landscape with star */}
        <path d="M8 28L14 20L20 24L26 16L32 20V28H8Z" />
        <circle cx="28" cy="14" r="1.5" fill="currentColor" />
        <path d="M26 12L28 14L30 12" />
      </svg>
    ),
    heading: 'Accurate restoration with AI',
    description: 'Sogni AI uses cutting-edge machine learning to intelligently repair damage, enhance facial details, and restore clarity to your photos with precision.'
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Landscape with refresh arrows and sparkles */}
        <path d="M8 28L14 20L20 24L26 16L32 20V28H8Z" />
        <path d="M16 16C16 16 18 14 20 16C22 18 20 20 20 20" />
        <path d="M24 20C24 20 22 22 20 20C18 18 20 16 20 16" />
        <circle cx="14" cy="14" r="1" fill="currentColor" />
        <circle cx="26" cy="14" r="1" fill="currentColor" />
      </svg>
    ),
    heading: 'Restore photos in seconds',
    description: 'Sogni\'s powerful restoration engine transforms damaged, faded, or aged photographs into vibrant memories almost instantly with just a few clicks.'
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Two overlapping images with pencil */}
        <rect x="8" y="14" width="16" height="12" rx="1.5" />
        <rect x="16" y="18" width="16" height="12" rx="1.5" />
        <path d="M30 22L32 24L28 28L26 26Z" />
        <line x1="26" y1="26" x2="28" y2="28" />
      </svg>
    ),
    heading: 'Restore in batches',
    description: 'Process multiple images simultaneously with Sogni\'s batch restoration feature. Restore entire photo collections efficiently without manual work.'
  }
];

export const FeaturesSection: React.FC = () => {
  return (
    <div className="w-full py-8 lg:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center fade-in"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both',
                opacity: 0
              }}
            >
              {/* Icon Circle */}
              <div
                className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)'
                }}
              >
                {feature.icon}
              </div>
              
              {/* Heading */}
              <h3
                className="font-bold mb-2"
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: '1.125rem',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em'
                }}
              >
                {feature.heading}
              </h3>
              
              {/* Description */}
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  fontWeight: 400
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

