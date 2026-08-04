import {
  LayoutDashboard,
  BookOpen,
  Package,
  Users,
  Award,
  FileText,
  CreditCard,
  Star,
  Tag,
  ClipboardList,
  Settings,
  X,
} from 'lucide-react';
import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/digital-assets', label: 'Digital Assets', icon: Package },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
];

interface AdminSidebarProps {
  /** Whether the mobile drawer is open (controlled by AdminLayout). */
  mobileOpen: boolean;
  /** Close the mobile drawer (called on backdrop click, close button, or nav). */
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ mobileOpen, onClose }) => {
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
          onClick={onClose}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile drawer (opened from the sticky sub-header in AdminLayout) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 t-overlay"
            onClick={onClose}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 t-bg t-border border-r shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b t-border">
              <span className="font-bold t-text">Admin</span>
              <button onClick={onClose} aria-label="Close menu">
                <X size={20} className="t-text-2" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      {/* Desktop sidebar — pinned under the global nav (h-20) so it stays in
          view while the page scrolls (the admin main no longer scrolls itself). */}
      <aside className="hidden lg:block w-60 shrink-0 t-border border-r t-bg lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-5rem)] lg:overflow-y-auto">
        <div className="px-4 py-5 border-b t-border">
          <h2 className="text-lg font-bold t-text">Admin Portal</h2>
          <p className="text-xs t-text-2">Platform Management</p>
        </div>
        {nav}
      </aside>
    </>
  );
};
