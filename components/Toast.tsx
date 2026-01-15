import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: <CheckCircle size={20} className="text-green-600" />,
    error: <AlertCircle size={20} className="text-red-600" />,
    info: <Info size={20} className="text-blue-600" />
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 ${colors[type]} border rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 animate-slide-up max-w-md`}
      role="alert"
    >
      {icons[type]}
      <span className="text-sm font-medium flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="hover:opacity-70 transition"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// Hook for managing toast notifications
export const useToast = () => {
  const [toasts, setToasts] = React.useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ bottom: `${4 + index * 4.5}rem` }}
          className="fixed right-4 z-50"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        </div>
      ))}
    </>
  );

  return { showToast, ToastContainer };
};
