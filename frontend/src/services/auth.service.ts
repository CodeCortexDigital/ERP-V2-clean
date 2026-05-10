import api from './api';

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    is_demo?: boolean;
    demo_remaining_days?: number;
  };
  is_demo?: boolean;
  demo_warning?: boolean;
  demo_message?: string;
}

const authService = {
  // Normal login
  login: (email: string, password: string) => 
    api.post<LoginResponse>('/auth/login/', { email, password }),
  
  // Demo login - one click test account
  demoLogin: (name?: string) => 
    api.post<LoginResponse>('/auth/demo/', { name: name || 'Demo User' }),
  
  // Firebase / Google OAuth login
  googleLogin: (token: string) => 
    api.post<LoginResponse>('/auth/firebase/login/', { id_token: token }),
  
  // Get current user
  getCurrentUser: () => 
    api.get('/auth/me/'),
  
  // Logout
  logout: () => 
    api.post('/auth/logout/', {}),
  
  // Refresh token
  refreshToken: (refresh: string) => 
    api.post<{ access: string }>('/auth/refresh/', { refresh }),
};

export default authService;
