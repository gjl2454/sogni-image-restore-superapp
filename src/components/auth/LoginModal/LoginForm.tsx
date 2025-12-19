import { useCallback, useEffect } from 'react';
import useForm, { ErrorData } from '../../../hooks/useForm';
import FormField from '../../shared/FormField';
import { useSogniAuth } from '../../../services/sogniAuth';
import {
  ErrorMessage,
  FieldContainer,
  FormContent,
  FormFooter,
  FormPanel,
  LinkButton
} from './common';

interface LoginFields {
  username: string;
  password: string;
  remember: boolean;
}

const defaultState: LoginFields = {
  username: '',
  password: '',
  remember: true
};

async function validateLogin(fields: LoginFields) {
  const errors: Record<string, string> = {};
  const username = fields.username;
  if (!username) {
    errors.username = 'Username is required';
  } else if (!/^[a-zA-Z]/.test(username)) {
    errors.username = 'Username must start with a letter';
  } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    errors.username = 'Allowed characters are letters, numbers, hyphens, underscores, and periods';
  } else if (username.length < 4 || username.length > 20) {
    errors.username = 'Username must be between 4 and 20 characters long';
  }

  if (!fields.password) {
    errors.password = 'Password is required';
  }

  return errors;
}

function LoginError({ error }: { error: ErrorData | null }) {
  if (!error) {
    return null;
  }
  if (error.code === 105) {
    return <ErrorMessage>Invalid username or password</ErrorMessage>;
  }
  return <ErrorMessage>{error.message}</ErrorMessage>;
}

interface Props {
  onSignup: () => void;
  onClose: () => void;
}

function LoginForm({ onSignup, onClose }: Props) {
  const { ensureClient, setAuthenticatedState } = useSogniAuth();

  const doLogin = useCallback(
    async (payload: LoginFields) => {
      const client = await ensureClient();

      await client.account.login(payload.username, payload.password, payload.remember);

      console.log('✅ Login successful!', {
        username: payload.username,
        clientAuthenticated: client.account.currentAccount?.isAuthenicated
      });

      if (payload.remember) {
        localStorage.setItem('sogni-persist', 'true');
      } else {
        localStorage.removeItem('sogni-persist');
      }

      setAuthenticatedState(
        payload.username,
        client.account.currentAccount?.email
      );

      onClose();
    },
    [ensureClient, setAuthenticatedState, onClose]
  );

  const { fields, isLoading, error, fieldErrors, handleFieldChange, handleFormSubmit } = useForm(
    defaultState,
    doLogin,
    validateLogin
  );

  const handleUsernameChange = useCallback(
    (value: string) => {
      handleFieldChange(value.trim(), 'username');
    },
    [handleFieldChange]
  );

  useEffect(() => {
    if (error) {
      handleFieldChange('', 'password');
    }
  }, [error, handleFieldChange]);

  return (
    <FormPanel onSubmit={handleFormSubmit} disabled={isLoading}>
      <FormContent subHeading="Sign in to restore your photos">
        {error && <LoginError error={error} />}
        <FieldContainer>
          <FormField
            name="username"
            label="Username"
            value={fields.username}
            type="text"
            autoComplete="username"
            placeholder="Username"
            onChange={handleUsernameChange}
            error={fieldErrors.username}
            size="lg"
          />
          <FormField
            name="password"
            label="Password"
            value={fields.password}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            onChange={handleFieldChange}
            error={fieldErrors.password}
            size="lg"
          />
          <FormField
            name="remember"
            label="Remember me"
            type="checkbox"
            checked={fields.remember}
            onChange={handleFieldChange}
          />
        </FieldContainer>
        <FormFooter>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="mt-4">
            <span className="text-gray-600">Don't have an account? </span>
            <LinkButton onClick={onSignup}>Sign up</LinkButton>
          </div>
        </FormFooter>
      </FormContent>
    </FormPanel>
  );
}

export default LoginForm;

