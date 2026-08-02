import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from './api';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'mechanic' | 'admin';
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  garage_name?: string;
  lat?: number;
  lng?: number;
  online?: boolean;
  rating_avg?: number;
  rating_count?: number;
  sos_contacts?: { id: string; name: string; phone: string }[];
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (body: any) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const u = await api.me();
          setUser(u);
        } catch {
          await clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    await setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (body: any) => {
    const res = await api.register(body);
    await setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  const refresh = async () => {
    try {
      const u = await api.me();
      setUser(u);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
