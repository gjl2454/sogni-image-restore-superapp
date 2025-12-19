import { useCallback } from 'react';
import { Step1Fields, Step2Fields } from '../types';
import { FormContent, FormFooter, FormPanel, ErrorMessage } from '../common';
import useForm from '../../../../hooks/useForm';
import { useSogniAuth } from '../../../../services/sogniAuth';

const emptyState = {};

interface Props {
  step1: Step1Fields;
  step2: Step2Fields;
  onReturn: () => void;
  onContinue: () => void;
}

function Step3({ step1, step2, onReturn, onContinue }: Props) {
  const { ensureClient, setAuthenticatedState } = useSogniAuth();

  const doSignup = useCallback(async () => {
    const { username, email, subscribe, referralCode, remember } = step1;
    const { password } = step2;

    const client = await ensureClient();

    // Create account (without Turnstile for now - can be added later)
    await client.account.create(
      {
        username,
        email,
        password,
        subscribe,
        referralCode: referralCode || 'RESTORATION'
      },
      remember
    );

    console.log('✅ Account created successfully!', {
      username,
      email,
      clientAuthenticated: client.account.currentAccount?.isAuthenicated
    });

    if (remember) {
      localStorage.setItem('sogni-persist', 'true');
    } else {
      localStorage.removeItem('sogni-persist');
    }

    setAuthenticatedState(
      username,
      email
    );

    onContinue();
  }, [step1, step2, ensureClient, setAuthenticatedState, onContinue]);

  const { isLoading, error, handleFormSubmit } = useForm(
    emptyState,
    doSignup
  );

  return (
    <FormPanel onSubmit={handleFormSubmit} disabled={isLoading}>
      <FormContent subHeading="Creating your account...">
        {error && <ErrorMessage>{error.message}</ErrorMessage>}
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Please wait while we create your account...</p>
        </div>
        <FormFooter>
          <button
            type="button"
            onClick={onReturn}
            disabled={isLoading}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            ← Back
          </button>
        </FormFooter>
      </FormContent>
    </FormPanel>
  );
}

export default Step3;

