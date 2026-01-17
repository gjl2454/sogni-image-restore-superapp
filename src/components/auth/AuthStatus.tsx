import React, { useState, useEffect, useRef } from 'react';
import { useSogniAuth } from '../../services/sogniAuth';
import { useWallet } from '../../hooks/useWallet';
import { formatTokenAmount, getTokenLabel, redirectToWallet } from '../../services/walletService';
import LoginModal, { LoginModalMode } from './LoginModal';

interface AuthStatusProps {
  onPurchaseClick?: () => void;
  onSignupComplete?: () => void;
  textColor?: string;
}

export const AuthStatus: React.FC<AuthStatusProps> = ({ onPurchaseClick, onSignupComplete, textColor = '#ffffff' }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<LoginModalMode>('login');
  const menuContainerRef = useRef<HTMLDivElement>(null);
  
  const { isAuthenticated, authMode, user, logout, isLoading } = useSogniAuth();
  const { balances, tokenType, switchPaymentMethod } = useWallet();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu && menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleLoginClick = () => {
    setLoginModalMode('login');
    setShowLoginModal(true);
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
  };

  const handleSignupComplete = () => {
    setShowLoginModal(false);
    if (onSignupComplete) {
      onSignupComplete();
    }
  };

  const handleBuyCredits = () => {
    if (onPurchaseClick) {
      onPurchaseClick();
      return;
    }
    redirectToWallet();
  };

  const currentBalance = balances?.[tokenType]?.net || '0';
  const tokenLabel = getTokenLabel(tokenType);
  const hasPremiumSpark = balances ? parseFloat(balances.spark.premiumCredit || '0') > 1 : false;

  return (
    <>
      {!isAuthenticated ? (
        <button
          onClick={handleLoginClick}
          disabled={isLoading}
          className="auth-signin-btn"
          style={{
            background: 'var(--sogni-purple)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            opacity: isLoading ? 0.5 : 1
          }}
        >
          {isLoading ? 'Loading...' : 'Sign In'}
        </button>
      ) : (
        <div className="relative" ref={menuContainerRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label="User menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </button>

          {showUserMenu && (
            <div 
              className="absolute top-full right-0 mt-2 z-50"
              style={{ 
                marginTop: '8px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                minWidth: '240px',
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              {authMode !== 'demo' && balances && (
                <>
                  {/* Credits Balance Display */}
                  <div style={{ 
                    textAlign: 'center',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--color-border)'
                  }}>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700', 
                      background: 'var(--sogni-gradient)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '4px'
                    }}>
                      {formatTokenAmount(currentBalance, 2)} {tokenLabel}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 500
                    }}>
                      Available Credits
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: 'var(--color-text-primary)',
                      marginBottom: '10px'
                    }}>
                      Payment Method
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => switchPaymentMethod('sogni')}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                          transition: 'all var(--transition-base)',
                          cursor: 'pointer',
                          border: tokenType === 'sogni' ? '2px solid var(--color-light-blue)' : '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          position: 'relative',
                          ...(tokenType === 'sogni'
                            ? {
                                background: 'var(--sogni-gradient)',
                                color: 'white',
                                boxShadow: '0 0 0 2px rgba(180, 205, 237, 0.4), 0 4px 12px rgba(52, 73, 102, 0.2)'
                              }
                            : {
                                background: 'var(--color-bg)',
                                color: 'var(--color-text-secondary)'
                              })
                        }}
                        onMouseEnter={(e) => {
                          if (tokenType !== 'sogni') {
                            e.currentTarget.style.background = 'var(--color-bg-secondary)';
                            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (tokenType !== 'sogni') {
                            e.currentTarget.style.background = 'var(--color-bg)';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                          }
                        }}
                      >
                        {tokenType === 'sogni' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                        <span>SOGNI</span>
                      </button>
                      <button
                        onClick={() => switchPaymentMethod('spark')}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.8125rem',
                          fontWeight: '600',
                          transition: 'all var(--transition-base)',
                          cursor: 'pointer',
                          border: tokenType === 'spark' ? '2px solid var(--color-light-blue)' : '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          position: 'relative',
                          ...(tokenType === 'spark'
                            ? {
                                background: 'var(--color-blue-gray)',
                                color: 'white',
                                boxShadow: '0 0 0 2px rgba(180, 205, 237, 0.4), 0 4px 12px rgba(52, 73, 102, 0.2)'
                              }
                            : {
                                background: 'var(--color-bg)',
                                color: 'var(--color-text-secondary)'
                              })
                        }}
                        onMouseEnter={(e) => {
                          if (tokenType !== 'spark') {
                            e.currentTarget.style.background = 'var(--color-bg-secondary)';
                            e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (tokenType !== 'spark') {
                            e.currentTarget.style.background = 'var(--color-bg)';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                          }
                        }}
                      >
                        {tokenType === 'spark' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                        <span>Spark</span>
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleBuyCredits}
                    style={{
                      width: '100%',
                      background: 'var(--color-blue-gray)',
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      marginBottom: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all var(--transition-base)',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-dark-navy)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-blue-gray)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    Buy Credits
                  </button>
                </>
              )}

              <div style={{ 
                paddingTop: '12px', 
                borderTop: '1px solid var(--color-border)'
              }}>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.8125rem',
                    fontWeight: '500',
                    textAlign: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-base)',
                    opacity: isLoading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                      e.currentTarget.style.background = 'var(--color-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {isLoading ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          )}

          {showUserMenu && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
          )}
        </div>
      )}
      
      <LoginModal
        open={showLoginModal}
        mode={loginModalMode}
        onModeChange={setLoginModalMode}
        onClose={handleCloseLoginModal}
        onSignupComplete={handleSignupComplete}
      />
    </>
  );
};

