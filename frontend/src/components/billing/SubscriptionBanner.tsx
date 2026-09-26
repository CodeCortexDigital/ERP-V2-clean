import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Lock } from 'lucide-react';
import { usePlanStore } from '@/store/planStore';
import { useAuthStore } from '@/store/authStore';

/** A strip above every page when the plan needs attention: trial ending, payment overdue, or read-only. */
export default function SubscriptionBanner() {
  const sub = usePlanStore((s) => s.sub);
  const isAdmin = useAuthStore((s) => s.role) === 'admin';
  if (!sub) return null;
  const link = isAdmin && <Link to="/settings/billing" className="font-bold underline underline-offset-2 ms-1">Plan & billing</Link>;

  if (sub.status === 'read_only' || sub.status === 'suspended') {
    return (
      <div role="alert" className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 text-white">
        <Lock size={15} className="shrink-0" />
        <span>{sub.status === 'suspended' ? 'This school account is suspended.' : 'The school is read-only: you can view and export, but not add or change.'}
          {isAdmin ? <> Choose a plan in {link} to continue.</> : ' Please contact the school office.'}</span>
      </div>
    );
  }
  if (!isAdmin) return null;
  if (sub.status === 'past_due') {
    return (
      <div role="status" className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 text-amber-950">
        <AlertTriangle size={15} className="shrink-0" />
        <span>The subscription payment is overdue{sub.grace_ends_at ? `; the school becomes read-only on ${new Date(sub.grace_ends_at).toLocaleDateString()}` : ''}. Renew in {link}.</span>
      </div>
    );
  }
  if (sub.status === 'trialing' && sub.trial_days_left != null && sub.trial_days_left <= 7) {
    return (
      <div role="status" className="flex items-center gap-2 px-4 py-2 text-sm bg-sky-100 text-sky-900">
        <Clock size={15} className="shrink-0" />
        <span>{sub.trial_days_left === 0 ? 'Your free trial ends today.' : `Your free trial ends in ${sub.trial_days_left} day${sub.trial_days_left === 1 ? '' : 's'}.`} Choose a plan in {link}.</span>
      </div>
    );
  }
  return null;
}
