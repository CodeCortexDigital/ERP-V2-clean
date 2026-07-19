import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowLeft, Loader2, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export default function StudentNotificationsPage() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, loading } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
          <Bell size={16} className="text-blue-600" /> My Notifications
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllAsRead}
            className="text-[11px] font-bold text-blue-600 flex items-center gap-1"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
          <Link to="/student" className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
            <ArrowLeft size={13} /> Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-bold">
          No notifications yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={`px-4 py-3 cursor-pointer ${n.is_read ? 'bg-slate-50' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
              <p className="mt-1 text-xs text-slate-600">{n.message}</p>
              {n.created_at && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
