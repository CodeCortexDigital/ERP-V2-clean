export type ToastNotification = {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  action?: {
    label: string
    onClick: () => void
  }
}

const toasts: ToastNotification[] = []

const listeners: Array<(newToasts: ToastNotification[]) => void> = []

export const toastManager = {
  subscribe: (callback: (newToasts: ToastNotification[]) => void) => {
    listeners.push(callback)
    return () => {
      const index = listeners.indexOf(callback)
      if (index !== -1) listeners.splice(index, 1)
    }
  },
  getToasts: () => toasts,
  dismiss: (id: string) => {
    const index = toasts.findIndex((toast) => toast.id === id)
    if (index !== -1) {
      toasts.splice(index, 1)
      listeners.forEach((callback) => callback([...toasts]))
    }
  },
  success: (title: string, message: string) => {
    const toast = { id: crypto.randomUUID(), title, message, type: 'success' as const }
    toasts.push(toast)
    listeners.forEach((callback) => callback([...toasts]))
  },
  error: (title: string, message: string) => {
    const toast = { id: crypto.randomUUID(), title, message, type: 'error' as const }
    toasts.push(toast)
    listeners.forEach((callback) => callback([...toasts]))
  },
  warning: (title: string, message: string) => {
    const toast = { id: crypto.randomUUID(), title, message, type: 'warning' as const }
    toasts.push(toast)
    listeners.forEach((callback) => callback([...toasts]))
  },
}

export default toastManager;
