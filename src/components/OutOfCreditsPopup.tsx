import React, { useRef, useEffect } from 'react';
import { redirectToWallet } from '../services/walletService';

interface OutOfCreditsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase?: () => void;
}

export const OutOfCreditsPopup: React.FC<OutOfCreditsPopupProps> = ({ isOpen, onClose, onPurchase }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleGetCreditsClick = () => {
    if (onPurchase) {
      onPurchase();
      onClose();
    } else {
      redirectToWallet();
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          onClick={onClose}
        >
          ×
        </button>

        <div className="text-center mb-6">
          <div className="text-6xl mb-4">😅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Out of Credits!</h2>
          <p className="text-gray-600">
            You can get back to restoring photos in no time.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">🎁</span>
            <span className="text-sm text-gray-700">
              Check for <strong>free daily credits</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-2xl">💳</span>
            <span className="text-sm text-gray-700">
              Buy more render credits
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleGetCreditsClick}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
          >
            Get More Credits →
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

