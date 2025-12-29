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
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: textColor,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              userSelect: 'none',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ color: textColor, fontWeight: '700' }}>
              @{authMode === 'demo' ? 'Demo Mode' : user?.username || 'User'}
            </span>
            
            {authMode !== 'demo' && balances && (
              <>
                <span style={{ color: textColor, opacity: 0.7 }}>|</span>
                <span style={{ 
                  color: (tokenType === 'spark' && hasPremiumSpark) ? '#00D5FF' : textColor,
                  fontWeight: (tokenType === 'spark' && hasPremiumSpark) ? '600' : '500',
                }}>
                  {formatTokenAmount(currentBalance)} {tokenLabel}
                </span>
              </>
            )}
          </div>

          {showUserMenu && (
            <div 
              className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl p-4 min-w-[200px] z-50"
              style={{ marginTop: '4px' }}
            >
              {authMode !== 'demo' && balances && (
                <>
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Paying with</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => switchPaymentMethod('sogni')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          tokenType === 'sogni'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        SOGNI
                      </button>
                      <button
                        onClick={() => switchPaymentMethod('spark')}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          tokenType === 'spark'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Spark
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleBuyCredits}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-sm font-medium mb-2"
                  >
                    Buy Credits
                  </button>
                </>
              )}

              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full text-gray-500 text-sm hover:text-gray-700 text-center"
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

