import { useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    dropdownOpen,
    setDropdownOpen,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const containerRef = useRef<HTMLDivElement>(null)

  const toggleDropdown = () => {
    if (!dropdownOpen) {
      fetchNotifications()
    }
    setDropdownOpen(!dropdownOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setDropdownOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg text-current opacity-90 hover:opacity-100 hover:bg-black/10 transition"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white/80">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">
                {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading && (
              <div className="p-4 text-sm text-slate-600">Loading notifications…</div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="p-4 text-sm text-slate-600">No notifications yet.</div>
            )}

            {!loading && notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b border-slate-100 px-4 py-3 ${notification.is_read ? 'bg-slate-50' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Read
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">{new Date(notification.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="border-t border-slate-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
