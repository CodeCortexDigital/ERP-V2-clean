import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type NotificationItem = {
  id: string
  title: string
  message: string
  notification_type: string
  is_read: boolean
  created_at: string
}

export function useNotifications(pollIntervalMs = 30000) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/notifications/unread-count/')
      setUnreadCount(response.data?.unread_count ?? 0)
      setError(null)
    } catch (err) {
      setError('Unable to load unread notifications')
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/auth/notifications/')
      setNotifications(response.data || [])
      setError(null)
    } catch (err) {
      setError('Unable to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.post(`/api/auth/notifications/mark-read/${id}/`)
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      )
      setUnreadCount((count) => Math.max(0, count - 1))
      setError(null)
    } catch (err) {
      setError('Unable to mark notification as read')
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/api/auth/notifications/mark-all-read/')
      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      )
      setUnreadCount(0)
      setError(null)
    } catch (err) {
      setError('Unable to mark all notifications as read')
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, pollIntervalMs)
    return () => clearInterval(interval)
  }, [fetchUnreadCount, pollIntervalMs])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    dropdownOpen,
    setDropdownOpen,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  }
}
