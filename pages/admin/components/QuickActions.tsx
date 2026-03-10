import { Plus, Users, Award, FileText } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const actions = [
  { label: 'New Course', icon: Plus, to: '/admin/courses/new', className: 'bg-brand-600 hover:bg-brand-500 text-white' },
  { label: 'Manage Users', icon: Users, to: '/admin/users', className: 't-status-info border hover:opacity-80' },
  { label: 'Certificates', icon: Award, to: '/admin/certificates', className: 't-status-warning border hover:opacity-80' },
  { label: 'Content', icon: FileText, to: '/admin/content', className: 'bg-brand-600/10 border border-brand-600/20 text-brand-400 hover:opacity-80' },
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="t-card t-border border p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-bold mb-4 t-text">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map(({ label, icon: Icon, className, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={`${className} rounded-lg p-4 flex flex-col items-center gap-2 transition`}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
