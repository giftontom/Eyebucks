import {
  LayoutDashboard,
  BookOpen,
  Users,
  Award,
  FileText,
  CreditCard,
  Star,
  Tag,
  Menu,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
];

export const AdminSidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 outline-none ${
      isActive
        ? 'bg-brand-600 text-white'
        : 't-text-2 hover:t-card hover:t-text'
    }`;

  const nav = (
    <nav className="space-y-1 px-3 py-4">
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={linkClass}
          onClick={() => setMobileOpen(false)}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 t-bg t-border border rounded-lg shadow-sm t-text"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 t-overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 t-bg t-border border-r shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b t-border">
              <span className="font-bold t-text">Admin</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={20} className="t-text-2" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 t-border border-r t-bg min-h-screen">
        <div className="px-4 py-5 border-b t-border">
          <h2 className="text-lg font-bold t-text">Admin Portal</h2>
          <p className="text-xs t-text-2">Platform Management</p>
        </div>
        {nav}
      </aside>
    </>
  );
};
