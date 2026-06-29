import React, { useState } from 'react';
import { Key, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';

interface SetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIdentifier: string;
  userName: string;
  userRole: 'teacher' | 'student' | 'user';
}

export default function SetPasswordModal({
  isOpen,
  onClose,
  userIdentifier,
  userName,
  userRole
}: SetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/api/auth/admin-set-password/', {
        user_id: userIdentifier,
        new_password: newPassword
      });

      setMessage({
        type: 'success',
        text: response.data.detail || `Password for ${userName} updated successfully!`
      });
      setNewPassword('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1800);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Key className="w-5 h-5" />
            <span>Set Account Password</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-900">
            <p className="font-medium">{userName}</p>
            <p className="text-xs text-blue-600 capitalize">{userRole} • {userIdentifier}</p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              New Password
            </label>
            <Input
              type="password"
              placeholder="Enter new password (min 6 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
