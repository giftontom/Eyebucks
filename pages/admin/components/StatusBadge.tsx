import React from 'react';

const statusStyles: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  REVOKED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-slate-100 text-slate-600',
  PENDING: 'bg-blue-100 text-blue-700',
  captured: 'bg-green-100 text-green-700',
  refunded: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-slate-100 text-slate-600',
  USER: 'bg-blue-100 text-blue-700',
  ADMIN: 'bg-purple-100 text-purple-700',
  MODULE: 'bg-slate-100 text-slate-500',
  BUNDLE: 'bg-purple-100 text-purple-700',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => (
  <span
    role="status"
    className={`px-2 py-0.5 rounded text-xs font-bold ${statusStyles[status] || 'bg-slate-100 text-slate-600'} ${className}`}
  >
    {status}
  </span>
);
