import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('expenses_token');
    if (!token) { setLoading(false); return; }

    client.get('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('expenses_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await client.post('/auth/login', { username, password });
    if (data.require_2fa) {
      // Throw so LoginPage can handle the 2FA step
      throw { require_2fa: true, temp_token: data.temp_token };
    }
    localStorage.setItem('expenses_token', data.token);
    setUser(data.user);
  }, []);

  const loginWith2fa = useCallback(async (temp_token, code) => {
    const data = await client.post('/auth/2fa/login', { temp_token, code });
    localStorage.setItem('expenses_token', data.token);
    setUser(data.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await client.get('/auth/me');
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('expenses_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWith2fa, refreshUser, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
