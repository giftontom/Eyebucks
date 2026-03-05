import { Plus, Users, Award, FileText } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    { label: 'New Course', icon: Plus, color: 'bg-brand-600 hover:bg-brand-700', to: '/admin/courses/new' },
    { label: 'Manage Users', icon: Users, color: 'bg-blue-600 hover:bg-blue-700', to: '/admin/users' },
    { label: 'Certificates', icon: Award, color: 'bg-yellow-600 hover:bg-yellow-700', to: '/admin/certificates' },
    { label: 'Content', icon: FileText, color: 'bg-purple-600 hover:bg-purple-700', to: '/admin/content' },
  ];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold mb-4 text-slate-900">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map(({ label, icon: Icon, color, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className={`${color} text-white rounded-lg p-4 flex flex-col items-center gap-2 transition`}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
