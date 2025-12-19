import React, { useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LoginModalMode } from './types';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { defaultModalText, ModalContextProvider, ModalText } from './context';

interface Props {
  open: boolean;
  mode: LoginModalMode;
  onModeChange: (mode: LoginModalMode) => void;
  onClose: () => void;
  textOverrides?: Partial<ModalText>;
  onSignupComplete?: () => void;
}

const emptyObject = {};

function LoginModal({ open, mode, onModeChange, onClose, textOverrides = emptyObject, onSignupComplete }: Props) {
  const modalCtx = useMemo(
    () => ({
      text: { ...defaultModalText, ...textOverrides }
    }),
    [textOverrides]
  );

  const handleLogin = useCallback(() => onModeChange('login'), [onModeChange]);
  const handleSignup = useCallback(() => onModeChange('signup'), [onModeChange]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!open) return null;

  let content;
  switch (mode) {
    case 'login':
      content = <LoginForm onSignup={handleSignup} onClose={onClose} />;
      break;
    case 'signup':
      content = <SignupForm onLogin={handleLogin} onClose={onClose} onSignupComplete={onSignupComplete} />;
      break;
    default:
      content = null;
  }

  const modalContent = (
    <ModalContextProvider value={modalCtx}>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleOverlayClick}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            onClick={onClose}
          >
            ×
          </button>
          <div className="p-6">{content}</div>
        </div>
      </div>
    </ModalContextProvider>
  );

  return createPortal(modalContent, document.body);
}

export default LoginModal;

