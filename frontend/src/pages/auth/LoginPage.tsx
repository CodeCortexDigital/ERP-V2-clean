import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, LogIn, Sparkles, Chrome } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@code.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, demoLogin, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    const token = credentialResponse?.credential;
    if (!token) {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
      return;
    }

    try {
      await googleLogin(token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLoginTrigger = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    },
    flow: 'implicit',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Sending login with:', {email, password});
      await login(email, password);
      if (email === 'teacher@test.com') {
        navigate('/teacher');
      } else if (email === 'parent@test.com') {
        navigate('/parent');
      } else if (email === 'student43@example.com' || email.includes('@student.com')) {
        navigate('/parent');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError('');

    try {
      await demoLogin();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Demo login failed');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-3">
            <span className="text-3xl font-bold text-white">EDU</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Code Cortex</h1>
          <p className="text-blue-100 mt-1">School Management System</p>
        </div>

        {/* Body */}
        <div className="p-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Demo Button - One Click Test */}
          
          {/* Quick Login Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={async () => {
                setEmail('admin@code.com');
                setPassword('admin123');
                setTimeout(() => {
                  document.querySelector('form')?.requestSubmit();
                }, 100);
              }}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              👑 Admin
            </button>
            <button
              onClick={async () => {
                setEmail('teacher@test.com');
                setPassword('teacher123');
                setTimeout(() => {
                  document.querySelector('form')?.requestSubmit();
                }, 100);
              }}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              👨‍🏫 Teacher
            </button>
            <button
              onClick={async () => {
                setEmail('parent@test.com');
                setPassword('parent123');
                setTimeout(() => {
                  document.querySelector('form')?.requestSubmit();
                }, 100);
              }}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
            >
              👨‍👩‍👧 Parent
            </button>
            <button
              onClick={async () => {
                setEmail('student43@example.com');
                setPassword('student123');
                setTimeout(() => {
                  document.querySelector('form')?.requestSubmit();
                }, 100);
              }}
              className="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
            >
              🎓 Student
            </button>
          </div>

          <button
            onClick={() => {
              setGoogleLoading(true);
              setError('');
              googleLoginTrigger();
            }}
            disabled={googleLoading}
            className="w-full mb-6 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <>
                <Chrome className="w-5 h-5" />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign in with email</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@code.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Demo: One-click trial | Admin: admin@code.com / admin123</p>`n            <p className="text-xs text-gray-400 mt-1">Students: Use Student ID (e.g., STU-2026-0043) or Email</p>
            <p className="mt-1">Student: student43@example.com / student123</p>
          </div>
        </div>
      </div>
    </div>
  );
}





