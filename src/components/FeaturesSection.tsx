import React, { useState } from 'react';

interface Feature {
  icon: React.ReactNode;
  heading: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    heading: 'Accurate restoration with AI',
    description: 'Sogni AI uses cutting-edge machine learning to intelligently repair damage, enhance facial details, and restore clarity to your photos with precision.'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    heading: 'Restore photos in seconds',
    description: 'Sogni\'s powerful restoration engine transforms damaged, faded, or aged photographs into vibrant memories almost instantly with just a few clicks.'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    heading: 'Restore in batches',
    description: 'Process multiple images simultaneously with Sogni\'s batch restoration feature. Restore entire photo collections efficiently without manual work.'
  }
];

export const FeaturesSection: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="w-full py-8 lg:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-6">
          <h2
            className="text-xl lg:text-2xl font-bold"
            style={{
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em'
            }}
          >
            Why Choose Sogni Restoration?
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {features.map((feature, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl overflow-hidden transition-all duration-300"
                style={{
                  background: isExpanded ? 'var(--color-bg-elevated)' : 'transparent',
                  border: `1px solid ${isExpanded ? 'var(--color-border)' : 'var(--color-border)'}`,
                  boxShadow: isExpanded ? 'var(--shadow-md)' : 'none'
                }}
              >
                {/* Header - Always visible */}
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full flex items-center gap-4 p-4 text-left transition-colors"
                  style={{
                    background: isExpanded
                      ? 'linear-gradient(135deg, var(--sogni-pink), var(--sogni-purple))'
                      : 'transparent'
                  }}
                >
                  {/* Icon */}
                  <div
                    className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg"
                    style={{
                      background: isExpanded ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-elevated)',
                      color: isExpanded ? 'white' : 'var(--sogni-purple)'
                    }}
                  >
                    {feature.icon}
                  </div>

                  {/* Title */}
                  <span
                    className="flex-1 font-semibold"
                    style={{
                      color: isExpanded ? 'white' : 'var(--color-text-primary)',
                      fontSize: '1rem'
                    }}
                  >
                    {feature.heading}
                  </span>

                  {/* Expand/Collapse Icon */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      color: isExpanded ? 'white' : 'var(--color-text-secondary)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Content - Expandable */}
                <div
                  style={{
                    maxHeight: isExpanded ? '200px' : '0',
                    opacity: isExpanded ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease, opacity 0.3s ease'
                  }}
                >
                  <p
                    className="px-4 pb-4 pt-2"
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.9375rem',
                      lineHeight: 1.7,
                      paddingLeft: '4.5rem'
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
