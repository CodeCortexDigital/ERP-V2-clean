/**
 * React Query key factory — use for cache invalidation after mutations.
 */
export const queryKeys = {
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.students.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.students.all, 'detail', id] as const,
  },
  classes: {
    all: ['classes'] as const,
    lists: () => [...queryKeys.classes.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.classes.all, 'detail', id] as const,
  },
  dashboard: {
    executive: () => ['dashboard', 'executive'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    attendance: () => [...queryKeys.analytics.all, 'attendance'] as const,
    fees: () => [...queryKeys.analytics.all, 'fees'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
  dropdown: (type: string) => ['dropdown', type] as const,
  features: {
    all: ['features'] as const,
    admin: (scope: string) => ['features', 'admin', scope] as const,
  },
};
