/**
 * Gullak Mobile - Alert Context
 * 
 * Provides alert state (unacknowledged count) to the entire app,
 * particularly for showing badge count on the Overview tab.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const AlertContext = createContext({
  unacknowledgedCount: 0,
  setUnacknowledgedCount: () => {},
  incrementUnacknowledged: () => {},
  decrementUnacknowledged: () => {},
});

export function AlertProvider({ children }) {
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);

  const incrementUnacknowledged = useCallback(() => {
    setUnacknowledgedCount(prev => prev + 1);
  }, []);

  const decrementUnacknowledged = useCallback(() => {
    setUnacknowledgedCount(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <AlertContext.Provider
      value={{
        unacknowledgedCount,
        setUnacknowledgedCount,
        incrementUnacknowledged,
        decrementUnacknowledged,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlertContext() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return context;
}
