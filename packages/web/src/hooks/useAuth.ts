import { useState } from 'react';
import { api } from '../api/client.ts';
import type { LoginResponse } from '../api/client.ts';

interface AuthState {
  token:               string | null;
  role:                string | null;
  mustChangePassword:  boolean;
  balance:             number;
}

function load(): AuthState {
  return {
    token:              localStorage.getItem('token'),
    role:               localStorage.getItem('role'),
    mustChangePassword: localStorage.getItem('mcp') === 'true',
    balance:            0,
  };
}

function save(res: LoginResponse) {
  localStorage.setItem('token', res.token);
  localStorage.setItem('role', res.role);
  localStorage.setItem('mcp', String(res.mustChangePassword));
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(load);

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    save(res);
    setAuth({ token: res.token, role: res.role, mustChangePassword: res.mustChangePassword, balance: res.balance });
    return res;
  };

  const afterPasswordChange = (token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('mcp', 'false');
    setAuth((prev) => ({ ...prev, token, mustChangePassword: false }));
  };

  const updateBalance = (balance: number) => setAuth((prev) => ({ ...prev, balance }));

  const logout = () => {
    localStorage.clear();
    setAuth({ token: null, role: null, mustChangePassword: false, balance: 0 });
  };

  return { auth, login, logout, afterPasswordChange, updateBalance };
}
