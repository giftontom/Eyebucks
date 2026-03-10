import React from 'react';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  zIndex = 'z-50',
}) => {
  if (!open) {return null;}

  return (
    <div
      className={`fixed inset-0 t-overlay backdrop-blur-sm flex items-center justify-center ${zIndex} p-4 overflow-y-auto`}
      onClick={(e) => { if (e.target === e.currentTarget) {onClose();} }}
    >
      <div className={`t-card t-border border rounded-xl w-full ${maxWidth} p-6 shadow-2xl my-8`}>
        <h3 className="text-lg font-bold mb-4 t-text">{title}</h3>
        {children}
      </div>
    </div>
  );
};
