import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { toastManager, type ToastNotification } from '../../services/notification.service';
import { cn } from '../../lib/utils';

interface ToastNotificationProps {
  className?: string;
}

export function ToastNotification({ className }: ToastNotificationProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    // Subscribe to toast changes
    const unsubscribe = toastManager.subscribe((newToasts) => {
      setToasts(newToasts);
    });

    // Initial toasts
    setToasts(toastManager.getToasts());

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismiss = (id: string) => {
    toastManager.dismiss(id);
  };

  const getIcon = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStyles = (type: ToastNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={cn('fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm', className)}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right',
            getStyles(toast.type)
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{toast.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{toast.message}</p>
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => handleDismiss(toast.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastNotification;