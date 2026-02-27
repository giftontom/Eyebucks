import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SalesDataPoint } from '../../../types';

interface SalesChartProps {
  salesData: SalesDataPoint[];
  onPeriodChange: (days: number) => void;
}

const periods = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export const SalesChart: React.FC<SalesChartProps> = ({ salesData, onPeriodChange }) => {
  const [activePeriod, setActivePeriod] = useState(30);

  if (salesData.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[400px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Sales Performance</h3>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {periods.map(p => (
            <button
              key={p.days}
              onClick={() => { setActivePeriod(p.days); onPeriodChange(p.days); }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activePeriod === p.days ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={salesData}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="date" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
          <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#0f172a' }}
            formatter={(value: number) => [`₹${(value / 100).toLocaleString()}`, 'Revenue']}
          />
          <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
