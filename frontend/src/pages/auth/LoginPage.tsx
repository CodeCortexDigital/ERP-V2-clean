import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@code.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Call login API
      const response = await api.post('/auth/login/', { email, password });
      console.log('Login response:', response.data);
      
      // Get the token from response
      const { access } = response.data;
      
      if (access) {
        // Store token
        localStorage.setItem('access_token', access);
        
        // Set default header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        
        // Test the token by fetching user info
        try {
          const userResponse = await api.get('/auth/me/');
          console.log('User info:', userResponse.data);
          
          // Store user info if needed
          localStorage.setItem('user', JSON.stringify(userResponse.data));
          
          // Redirect to dashboard
          navigate('/dashboard');
        } catch (userError) {
          console.error('Failed to fetch user:', userError);
          setError('Login successful but failed to load user data');
        }
      } else {
        setError('No access token received');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors[0]);
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-2xl font-bold text-blue-600">CC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Code Cortex</h1>
          <p className="text-gray-500 mt-1">School Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@code.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500">
            Demo Credentials: <span className="font-mono">admin@code.com</span> / <span className="font-mono">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
