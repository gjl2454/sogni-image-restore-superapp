import React, { createContext, useContext } from 'react';

export interface ModalText {
  heading: string;
  subHeading: string;
}

export const defaultModalText: ModalText = {
  heading: 'Welcome to Photo Restoration',
  subHeading: 'Sign in to restore your photos'
};

interface ModalContextValue {
  text: ModalText;
}

const ModalContext = createContext<ModalContextValue>({ text: defaultModalText });

export function useModalCtx() {
  return useContext(ModalContext);
}

export const ModalContextProvider = ModalContext.Provider;

