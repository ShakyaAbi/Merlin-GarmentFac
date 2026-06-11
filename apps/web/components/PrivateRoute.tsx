import React from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api';
import { clearToken, getToken } from '../services/apiClient';
import { resolvePrivateRouteState } from '../utils/privateRoute';

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authenticated, setAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthenticated(false);
      return;
    }

    let active = true;
    api.me()
      .then(() => {
        if (active) setAuthenticated(true);
      })
      .catch(() => {
        clearToken();
        if (active) setAuthenticated(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const token = getToken();
  const state = resolvePrivateRouteState(token, authenticated);

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Loading Merlin...</div>
          <div className="mt-1 text-sm text-slate-500">Checking your session.</div>
        </div>
      </div>
    );
  }

  if (state === 'denied') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
