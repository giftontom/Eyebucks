import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: string;
  /** When false, backdrop clicks and the Escape key are ignored (e.g. while an
   *  upload is in flight or a destructive action is running). Default true. */
  closeOnBackdrop?: boolean;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  zIndex = 'z-[60]',
  closeOnBackdrop = true,
}) => {
  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (!open) { return; }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Dismiss on Escape — gated by the same prop as the backdrop so a guarded
  // modal (upload in flight) can't be dismissed either way.
  useEffect(() => {
    if (!open || !closeOnBackdrop) { return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeOnBackdrop, onClose]);

  if (!open) { return null; }

  // Portal to <body> so the overlay escapes the admin layout's sticky headers /
  // stacking contexts and always covers the full viewport (incl. the global nav).
  return createPortal(
    <div
      className={`fixed inset-0 t-overlay backdrop-blur-sm flex items-center justify-center ${zIndex} p-4 overflow-y-auto`}
      onClick={(e) => { if (e.target === e.currentTarget && closeOnBackdrop) { onClose(); } }}
    >
      <div className={`t-card t-border border rounded-xl w-full ${maxWidth} p-6 shadow-2xl my-8`}>
        <h3 className="text-lg font-bold mb-4 t-text">{title}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
};
