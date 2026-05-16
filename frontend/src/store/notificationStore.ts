import { create } from 'zustand';
import api from '@/services/api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

const NOTIFICATIONS_BASE = '/v1/auth/notifications';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  dropdownOpen: boolean;
  wsConnected: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  setDropdownOpen: (open: boolean) => void;
  pushNotification: (item: NotificationItem) => void;
  setWsConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  dropdownOpen: false,
  wsConnected: false,

  setDropdownOpen: (open) => set({ dropdownOpen: open }),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get(`${NOTIFICATIONS_BASE}/unread-count/`);
      set({ unreadCount: data?.unread_count ?? 0, error: null });
    } catch {
      set({ error: 'Unable to load unread count' });
    }
  },

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get(`${NOTIFICATIONS_BASE}/`);
      const list = Array.isArray(data) ? data : data?.results ?? [];
      set({
        notifications: list,
        unreadCount: list.filter((n: NotificationItem) => !n.is_read).length,
        loading: false,
        error: null,
      });
    } catch {
      set({ loading: false, error: 'Unable to load notifications' });
    }
  },

  markRead: async (id) => {
    try {
      await api.post(`${NOTIFICATIONS_BASE}/mark-read/${id}/`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        error: null,
      }));
    } catch {
      set({ error: 'Unable to mark notification as read' });
    }
  },

  markAllRead: async () => {
    try {
      await api.post(`${NOTIFICATIONS_BASE}/mark-all-read/`);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
        error: null,
      }));
    } catch {
      set({ error: 'Unable to mark all as read' });
    }
  },

  pushNotification: (item) => {
    set((state) => ({
      notifications: [item, ...state.notifications],
      unreadCount: item.is_read ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      dropdownOpen: false,
      wsConnected: false,
    }),
}));
