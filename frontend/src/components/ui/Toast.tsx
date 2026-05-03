import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  description?: string
  duration?: number
}

export function toast(message: string, type: ToastType = 'info', options?: ToastOptions) {
  const { description = '' } = options || {}

  switch (type) {
    case 'success':
      return sonnerToast.success(message, { description })
    case 'error':
      return sonnerToast.error(message, { description })
    case 'warning':
      return sonnerToast.warning(message, { description })
    default:
      return sonnerToast(message, { description })
  }
}

export function Toaster() {
  return <SonnerToaster position="top-right" />
}

// Convenience functions
export const toastSuccess = (message: string, options?: ToastOptions) =>
  toast(message, 'success', options)

export const toastError = (message: string, options?: ToastOptions) =>
  toast(message, 'error', options)

export const toastInfo = (message: string, options?: ToastOptions) =>
  toast(message, 'info', options)

export const toastWarning = (message: string, options?: ToastOptions) =>
  toast(message, 'warning', options)