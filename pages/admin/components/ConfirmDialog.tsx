import React from 'react';

import { Button } from '../../../components';

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
  loading = false,
}) => (
  <AdminModal open={open} onClose={onClose} title={title}>
    <div className="text-slate-600 mb-2">{message}</div>
    {warning && (
      <p className="text-sm text-yellow-600 mb-6">{warning}</p>
    )}
    <div className="flex gap-3 mt-4">
      <Button variant="secondary" size="md" fullWidth onClick={onClose}>
        Cancel
      </Button>
      <Button variant="danger" size="md" fullWidth loading={loading} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </AdminModal>
);
