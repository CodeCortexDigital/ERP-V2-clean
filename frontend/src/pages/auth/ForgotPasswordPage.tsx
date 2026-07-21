import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '@/services/auth.service';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetKey, setResetKey] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setLoading(true);

    try {
      await (authService as any).resetPassword({
        identifier,
        new_password: newPassword,
        reset_key: resetKey || undefined,
        current_password: currentPassword || undefined,
      });
      setStatus('Password reset successfully. Please sign in with your new password.');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-8 py-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Forgot Admin Password</h1>
          <p className="text-sm text-slate-500 mb-6">
            Use your user ID or email and the admin reset key to update the password.
          </p>

          {status && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              {status}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">User ID or Email</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin user ID or email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="New secure password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Admin Reset Key</label>
              <input
                type="text"
                value={resetKey}
                onChange={(e) => setResetKey(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin reset key"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Current Password (optional)</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Current password if available"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            <Link to="/login" className="text-blue-600 hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
