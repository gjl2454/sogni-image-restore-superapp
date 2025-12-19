import React, { ReactNode } from 'react';
import { useModalCtx } from './context';

interface Props {
  children: ReactNode;
}

export function ContentPanel({ children }: Props) {
  return <div className="p-6">{children}</div>;
}

interface FormPanelProps extends Props {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
  autoComplete?: string;
  noValidate?: boolean;
}

export function FormPanel({ children, onSubmit, disabled, autoComplete, noValidate }: FormPanelProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-6"
      autoComplete={autoComplete}
      noValidate={noValidate}
    >
      <fieldset disabled={disabled} className="border-none p-0 m-0">
        {children}
      </fieldset>
    </form>
  );
}

interface FormContentProps extends Props {
  noHeading?: boolean;
  subHeading?: ReactNode;
}

export function FormContent({ children, noHeading, subHeading }: FormContentProps) {
  const { text } = useModalCtx();
  return (
    <div>
      <div className="text-center mb-6">
        {!noHeading && <h1 className="text-2xl font-bold text-gray-900 mb-2">{text.heading}</h1>}
        {subHeading && <h2 className="text-lg text-gray-600">{subHeading}</h2>}
      </div>
      {children}
    </div>
  );
}

export function FieldContainer({ children }: Props) {
  return <div className="space-y-4">{children}</div>;
}

export function FormFooter({ children }: Props) {
  return <div className="mt-6 text-center">{children}</div>;
}

export function ErrorMessage({ children }: Props) {
  return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{children}</div>;
}

interface LinkButtonProps extends Props {
  onClick: () => void;
}

export function LinkButton({ children, onClick }: LinkButtonProps) {
  return (
    <button className="text-blue-600 hover:text-blue-800 underline" onClick={onClick} type="button">
      {children}
    </button>
  );
}

