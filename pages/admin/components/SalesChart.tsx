import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { formatINR, formatCompactINR } from '../../../utils/format';

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
  const hasData = salesData.some((d) => d.amount > 0);

  return (
    <div className="t-card t-border border p-6 rounded-xl shadow-sm h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold t-text">Sales Performance</h3>
        <div className="flex gap-1 t-bg-alt p-1 rounded-lg">
          {periods.map(p => (
            <button
              key={p.days}
              onClick={() => { setActivePeriod(p.days); onPeriodChange(p.days); }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activePeriod === p.days ? 't-card t-text shadow-sm' : 't-text-2 hover:t-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {hasData ? (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-brand-600)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-brand-600)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-3)" axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="var(--text-3)" axisLine={false} tickLine={false} dx={-10} width={70} tickFormatter={(val) => formatCompactINR(val)} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: 'var(--text)' }}
                formatter={(value: number) => [formatINR(value), 'Revenue']}
              />
              <Area type="monotone" dataKey="amount" stroke="var(--color-brand-600)" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="t-text-2 font-medium">No sales in this period yet</p>
          <p className="t-text-3 text-sm mt-1">Revenue will appear here once you make your first sales.</p>
        </div>
      )}
    </div>
  );
};
