import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const path = location.pathname;

  // Hide on Learn, Admin, and Login pages
  if (path.startsWith('/learn') || path.startsWith('/admin') || path.startsWith('/login')) {
    return null;
  }

  const tabs = [
    { label: 'Home', route: '/', auth: false, icon: 'home', center: false },
    { label: 'Courses', route: '/courses', auth: false, icon: 'explore', center: false },
    { label: 'My Learning', route: '/dashboard', auth: true, icon: 'courses', center: true },
    { label: 'Alerts', route: '/notifications', auth: true, icon: 'alerts', center: false },
    { label: 'Profile', route: '/profile', auth: true, icon: 'profile', center: false },
  ] as const;

  const handleTabClick = (tab: typeof tabs[number]) => {
    if (tab.auth && !user) {
      navigate('/login');
      return;
    }
    navigate(tab.route);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden animate-slide-up"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile navigation"
    >
      <div className="[background-color:color-mix(in_srgb,var(--page-bg)_90%,transparent)] backdrop-blur-3xl border-t t-border">
        <div className="flex items-end justify-around px-1 h-[76px]">
          {tabs.map((tab) => {
            const active = path === tab.route;

            if (tab.center) {
              return (
                <button
                  key={tab.label}
                  onClick={() => handleTabClick(tab)}
                  className="flex flex-col items-center justify-center -mt-6 relative group focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--page-bg)] rounded-full outline-none transition-all duration-200"
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Elevated center button */}
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-brand-500 scale-110 shadow-2xl'
                      : 'bg-brand-600 group-active:scale-95'
                  }`}
                    style={{ boxShadow: active ? 'var(--shadow-brand)' : '0 6px 16px rgba(0,0,0,0.4)' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <span className={`text-xs font-bold mt-2 ${active ? 'text-brand-400' : 't-text-3'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.label}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center justify-center py-2 px-3 relative group focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--page-bg)] rounded-xl outline-none transition-all duration-200"
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`transition-all duration-200 ${active ? 'text-brand-400 scale-110' : 't-text-3 group-active:scale-90'}`}
                  style={active ? { filter: 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.3))' } : undefined}
                >
                  <TabIcon name={tab.icon} />
                </div>
                <span className={`text-xs mt-1.5 font-semibold ${active ? 'text-brand-400' : 't-text-3'}`}>
                  {tab.label}
                </span>
                {active && (
                  <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-brand-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

const TabIcon: React.FC<{ name: string }> = ({ name }) => {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'explore':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'alerts':
      return (
        <svg {...props}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
};

export { MobileBottomNav };
