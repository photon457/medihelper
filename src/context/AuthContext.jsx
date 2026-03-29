import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('medihelper_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('medihelper_token'));
  const [loading, setLoading] = useState(true);

  // On mount, verify token
  useEffect(() => {
    if (token) {
      authAPI.me()
        .then(res => {
          setUser(res.data);
          localStorage.setItem('medihelper_user', JSON.stringify(res.data));
        })
        .catch(() => {
          // Token invalid
          setUser(null);
          setToken(null);
          localStorage.removeItem('medihelper_token');
          localStorage.removeItem('medihelper_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('medihelper_token', newToken);
    localStorage.setItem('medihelper_user', JSON.stringify(newUser));
    return newUser;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('medihelper_token', newToken);
    localStorage.setItem('medihelper_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('medihelper_token');
    localStorage.removeItem('medihelper_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
