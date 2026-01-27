import React, { useState } from 'react';
import LoginModal, { LoginModalMode } from './auth/LoginModal';

export const SignInCTA: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<LoginModalMode>('login');

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ),
      title: '50 Free Credits Daily',
      description: 'Get free credits every day to restore your photos'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      ),
      title: 'Instant Access',
      description: 'Start restoring immediately after signing in'
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
      title: 'Personal Gallery',
      description: 'Your restorations are saved to your personal gallery'
    }
  ];

  return (
    <div className="w-full py-8 lg:py-12 px-4">
      <div
        className="max-w-4xl mx-auto rounded-2xl overflow-hidden fade-in"
        style={{
          background: 'linear-gradient(135deg, rgba(52, 73, 102, 0.03) 0%, rgba(180, 205, 237, 0.08) 100%)',
          border: '1px solid rgba(52, 73, 102, 0.1)',
          boxShadow: '0 4px 24px rgba(52, 73, 102, 0.08)'
        }}
      >
        <div className="px-6 py-8 lg:px-10 lg:py-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{
                background: 'linear-gradient(135deg, var(--sogni-pink), var(--sogni-purple))',
                color: 'white',
                fontSize: '0.8125rem',
                fontWeight: 600,
                letterSpacing: '0.02em'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              <span>Free Credits</span>
            </div>
            <h2
              className="text-2xl lg:text-3xl font-bold mb-3"
              style={{
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              Sign in with Sogni and start restoring
            </h2>
            <p
              className="text-lg lg:text-xl font-semibold gradient-accent"
              style={{
                lineHeight: 1.4
              }}
            >
              50 free credits daily!
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-center p-4 rounded-xl fade-in"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(52, 73, 102, 0.08)',
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both',
                  opacity: 0
                }}
              >
                <div
                  className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(52, 73, 102, 0.08) 0%, rgba(180, 205, 237, 0.15) 100%)',
                    color: 'var(--sogni-purple)'
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  className="font-semibold mb-1"
                  style={{
                    color: 'var(--color-text-primary)',
                    fontSize: '0.9375rem'
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.5
                  }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base font-semibold rounded-xl transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--sogni-pink), var(--sogni-purple))',
                boxShadow: '0 4px 16px rgba(180, 205, 237, 0.4)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10,17 15,12 10,7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Sign In to Get Started</span>
            </button>
            <p
              className="mt-3 text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              No credit card required
            </p>
          </div>
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        mode={loginModalMode}
        onModeChange={setLoginModalMode}
        onClose={() => setShowLoginModal(false)}
        onSignupComplete={() => setShowLoginModal(false)}
      />
    </div>
  );
};
