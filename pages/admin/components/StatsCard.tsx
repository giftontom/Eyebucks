import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  subtitleColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  iconBg,
  subtitleColor,
}) => (
  <div className="t-card t-border border p-6 rounded-xl shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <span className="t-text-2 text-xs font-bold uppercase tracking-wider">{label}</span>
      <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
    </div>
    <p className="text-3xl font-bold t-text">{value}</p>
    {subtitle && <p className={`text-xs mt-2 ${subtitleColor || 't-text-2'}`}>{subtitle}</p>}
  </div>
);
