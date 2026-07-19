import { useCallback, useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { websocketService } from '@/services/websocket.service';
import type { NotificationItem } from '@/store/notificationStore';

const POLL_MS = 30_000;

/**
 * Notification state + polling + WebSocket push (when VITE_WS_URL is set).
 */
export function useNotifications(pollIntervalMs = POLL_MS) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loading = useNotificationStore((s) => s.loading);
  const error = useNotificationStore((s) => s.error);
  const dropdownOpen = useNotificationStore((s) => s.dropdownOpen);
  const wsConnected = useNotificationStore((s) => s.wsConnected);

  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const markAsRead = useNotificationStore((s) => s.markRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllRead);
  const setDropdownOpen = useNotificationStore((s) => s.setDropdownOpen);
  const pushNotification = useNotificationStore((s) => s.pushNotification);
  const setWsConnected = useNotificationStore((s) => s.setWsConnected);
  const reset = useNotificationStore((s) => s.reset);

  // WebSocket: real-time notification push
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      websocketService.disconnect('notifications');
      setWsConnected(false);
      return;
    }

    // Demo mode has no real WebSocket backend — skip connecting entirely.
    if (accessToken === 'mock-access-token') {
      setWsConnected(false);
      return;
    }

    let cancelled = false;

    const connect = async () => {
      try {
        websocketService.connect(accessToken, 'notifications');
        if (!cancelled) setWsConnected(true);
      } catch {
        if (!cancelled) setWsConnected(false);
      }
    };

    connect();

    const unsubMessage = websocketService.subscribe(
      'notification',
      (message) => {
        const item = message.data as NotificationItem;
        if (item?.id) pushNotification(item);
        else fetchUnreadCount();
      },
      'notifications'
    );

    const unsubConn = websocketService.onConnectionChange((connected) => {
      setWsConnected(connected);
    }, 'notifications');

    return () => {
      cancelled = true;
      unsubMessage();
      unsubConn();
      websocketService.disconnect('notifications');
    };
  }, [
    isAuthenticated,
    accessToken,
    pushNotification,
    fetchUnreadCount,
    setWsConnected,
  ]);

  // Polling fallback
  useEffect(() => {
    if (!isAuthenticated) {
      reset();
      return;
    }

    fetchUnreadCount();
    const interval = window.setInterval(fetchUnreadCount, pollIntervalMs);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount, pollIntervalMs, reset]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    dropdownOpen,
    wsConnected,
    setDropdownOpen,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
