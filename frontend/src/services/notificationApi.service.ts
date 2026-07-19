import api, { extractListData } from './api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  /** GET /auth/notifications/ — list the current user's notifications. */
  list: async (params: { unread_only?: boolean } = {}) => {
    const res = await api.get('/auth/notifications/', { params });
    return extractListData<AppNotification>(res.data);
  },

  /** GET /auth/notifications/unread-count/ */
  unreadCount: async () => {
    const res = await api.get('/auth/notifications/unread-count/');
    return (res.data as { count?: number })?.count ?? 0;
  },

  /** POST /auth/notifications/mark-read/<pk>/ */
  markRead: async (id: string) => {
    await api.post(`/auth/notifications/mark-read/${id}/`);
  },

  /** POST /auth/notifications/mark-all-read/ */
  markAllRead: async () => {
    await api.post('/auth/notifications/mark-all-read/');
  },
};

export default notificationService;
