'use client';

import { createContext, useContext } from 'react';
import { useCSRF } from '../../hooks/useCSRF';

const CSRFContext = createContext();

export const useCSRFContext = () => {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRFContext must be used within a CSRFProvider');
  }
  return context;
};

export const CSRFProvider = ({ children }) => {
  const csrfValues = useCSRF();

  return (
    <CSRFContext.Provider value={csrfValues}>
      {children}
    </CSRFContext.Provider>
  );
};
