import React from 'react';

import { Badge, statusToVariant } from '../../../components';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => (
  <Badge variant={statusToVariant(status)} className={className}>{status}</Badge>
);
