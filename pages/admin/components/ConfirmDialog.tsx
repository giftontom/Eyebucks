import React from 'react';
import { AdminModal } from './AdminModal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  warning?: string;
  confirmLabel?: string;
  confirmColor?: string;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  confirmLabel = 'Confirm',
  confirmColor = 'bg-red-600 hover:bg-red-700',
  loading = false,
}) => (
  <AdminModal open={open} onClose={onClose} title={title}>
    <div className="text-slate-600 mb-2">{message}</div>
    {warning && (
      <p className="text-sm text-yellow-600 mb-6">{warning}</p>
    )}
    <div className="flex gap-3 mt-4">
      <button
        onClick={onClose}
        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 py-2 rounded-lg font-medium transition"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`flex-1 ${confirmColor} text-white py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? '...' : confirmLabel}
      </button>
    </div>
  </AdminModal>
);
