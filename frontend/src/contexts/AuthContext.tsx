import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/services/api';
import authService from '@/services/auth.service';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_demo?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    const { access, refresh, user: userData } = response.data;
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    setUser(userData);
  };

  const demoLogin = async () => {
    const response = await authService.demoLogin('Demo User');
    const { access, refresh, user: userData } = response.data;
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    setUser(userData);
    
    // Show warning if demo is expiring soon
    if (response.data.demo_warning) {
      alert(response.data.demo_message);
    }
  };

  const googleLogin = async (token: string) => {
    const response = await authService.googleLogin(token);
    const { access, refresh, user: userData } = response.data;
    
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, demoLogin, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
