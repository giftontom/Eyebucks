import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import React, { useCallback, useRef } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: <CheckCircle size={20} className="text-[var(--status-success-text)]" />,
    error: <AlertCircle size={20} className="text-[var(--status-danger-text)]" />,
    info: <Info size={20} className="text-[var(--status-info-text)]" />
  };

  const colors = {
    success: 't-status-success border',
    error: 't-status-danger border',
    info: 't-status-info border'
  };

  return (
    <div
      className={`${colors[type]} border rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-up max-w-[calc(100vw-2rem)] md:max-w-md`}
      role="alert"
    >
      {icons[type]}
      <span className="text-sm font-medium flex-1 break-words">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="hover:opacity-70 transition flex-shrink-0"
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// Counter for unique toast IDs — avoids Date.now() collision
let toastIdCounter = 0;
const MAX_VISIBLE_TOASTS = 5;

// Hook for managing toast notifications
export const useToast = () => {
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts(prev => {
      // Cap at MAX_VISIBLE_TOASTS — remove oldest if at limit
      const next = prev.length >= MAX_VISIBLE_TOASTS ? prev.slice(1) : prev;
      return [...next, { id, message, type }];
    });

    const timer = setTimeout(() => {
      dismissToast(id);
    }, duration);
    timersRef.current.set(id, timer);
  }, [dismissToast]);

  const ToastContainer = () => (
    <div
      className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-auto md:right-6 z-50 flex flex-col-reverse items-center md:items-end gap-2 pointer-events-none"
      style={{ paddingBottom: 'var(--safe-area-bottom)' }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full md:w-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => dismissToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
};
