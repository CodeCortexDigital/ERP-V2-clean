import { useEffect, useState } from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import TwoStepSection, { TwoStepStatus } from './TwoStepSection';

/** When two-step sign-in is required for this account (platform owner, or an administrator whose school requires it)
 * and it isn't on yet, set it up before anything else (P8). The server refuses changes until then. */
export default function TwoStepGate() {
  const [needed, setNeeded] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    api.get<TwoStepStatus>('/security/2fa/').then((r) => setNeeded(r.data.required && !r.data.enabled)).catch(() => undefined);
  }, []);
  if (!needed) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="two-step-gate">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <h2 id="two-step-gate" className="text-lg font-bold text-slate-900">Set up two-step sign-in to continue</h2>
            <p className="text-sm text-slate-600">Your account can change school-wide data, so it needs a code from your phone as well as your password.
              It takes about a minute.</p>
          </div>
        </div>
        <TwoStepSection onEnabled={() => setNeeded(false)} />
        <button onClick={() => { logout(); window.location.href = '/login'; }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:underline">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}
