import React from 'react';

const steps = [
  {
    number: '1',
    title: 'Upload Your Photo',
    description: 'Select any damaged, faded, or old photo from your device',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    )
  },
  {
    number: '2',
    title: 'AI Restores It',
    description: 'Our advanced AI repairs damage and enhances details in seconds',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    )
  },
  {
    number: '3',
    title: 'Download & Share',
    description: 'Save your restored photo and share your memories',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    )
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <div className="w-full py-8 lg:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-8">
        <h2
          className="text-xl lg:text-2xl font-bold mb-2"
          style={{
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em'
          }}
        >
          How It Works
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
          Restore your photos in three simple steps
        </p>
      </div>

        {/* Steps - Horizontal layout */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex-1 flex flex-col items-center text-center fade-in"
              style={{
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'both',
                opacity: 0
              }}
            >
              {/* Icon Circle */}
              <div
                className="relative flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-xl mb-4"
                style={{
                  background: 'linear-gradient(135deg, var(--sogni-pink), var(--sogni-purple))',
                  boxShadow: '0 4px 12px rgba(180, 205, 237, 0.3)'
                }}
              >
                <div style={{ color: 'white' }}>
                  {step.icon}
                </div>
                {/* Step Number Badge */}
                <div
                  className="absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: 'white',
                    color: 'var(--sogni-purple)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <h3
                className="font-semibold mb-2"
                style={{
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem'
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
