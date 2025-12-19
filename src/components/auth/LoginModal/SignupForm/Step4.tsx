import { useEffect, useRef } from 'react';
import { ContentPanel, FormContent, FormFooter } from '../common';
import { useSogniAuth } from '../../../../services/sogniAuth';

interface Props {
  onClose: () => void;
  onSignupComplete?: () => void;
}

function Step4({ onClose, onSignupComplete }: Props) {
  const { user, isAuthenticated } = useSogniAuth();
  const hasTriggeredCallback = useRef(false);

  useEffect(() => {
    if (isAuthenticated && user && !hasTriggeredCallback.current) {
      hasTriggeredCallback.current = true;
      
      const timer = setTimeout(() => {
        onClose();
        
        if (onSignupComplete) {
          setTimeout(() => {
            onSignupComplete();
          }, 100);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, onClose, onSignupComplete]);

  return (
    <ContentPanel>
      <FormContent
        subHeading={
          <>
            Welcome, <span className="font-bold text-blue-600">@{user?.username}</span>!
          </>
        }
      >
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold mb-2">Account Created Successfully!</h3>
          <p className="text-gray-600 mb-2">Check your email to verify your account and claim free credits.</p>
          <p className="text-sm text-gray-500 mt-4">
            ⭐ <strong>BONUS:</strong> 50 FREE Daily Boost credits daily!
          </p>
        </div>
      </FormContent>
      <FormFooter>
        <button
          type="button"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
          onClick={onClose}
        >
          Get Started
        </button>
      </FormFooter>
    </ContentPanel>
  );
}

export default Step4;

