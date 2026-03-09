import { createContext, useContext, useState, useCallback } from 'react';

const WorkspaceContext = createContext(null);

const WORKSPACE_CONFIG = {
  india: {
    label: 'Indian Expenses',
    flag: '🇮🇳',
    currency: 'INR',
    locale: 'en-IN',
  },
  us: {
    label: 'US Expenses',
    flag: '🇺🇸',
    currency: 'USD',
    locale: 'en-US',
  },
};

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspaceState] = useState(() => sessionStorage.getItem('expenses_workspace') || null);

  const selectWorkspace = useCallback((ws) => {
    sessionStorage.setItem('expenses_workspace', ws);
    setWorkspaceState(ws);
  }, []);

  const clearWorkspace = useCallback(() => {
    sessionStorage.removeItem('expenses_workspace');
    setWorkspaceState(null);
  }, []);

  const config = workspace ? WORKSPACE_CONFIG[workspace] : null;

  function fmt(n) {
    if (!config) return String(n);
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 2,
    }).format(n);
  }

  function fmtRound(n) {
    if (!config) return String(n);
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      maximumFractionDigits: 0,
    }).format(n);
  }

  return (
    <WorkspaceContext.Provider value={{ workspace, config, WORKSPACE_CONFIG, selectWorkspace, clearWorkspace, fmt, fmtRound }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
