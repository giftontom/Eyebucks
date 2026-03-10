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

  const isActive = (route: string) => {
    if (route === '/' ) {return path === '/';}
    return path.startsWith(route);
  };

  const handleNav = (route: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      navigate('/login');
    } else {
      navigate(route);
    }
  };

  const tabs = [
    { label: 'Home', route: '/', auth: false, icon: 'home', center: false, scroll: false },
    { label: 'Courses', route: '/', auth: false, icon: 'explore', center: false, scroll: true },
    { label: 'My Learning', route: '/dashboard', auth: true, icon: 'courses', center: true, scroll: false },
    { label: 'Alerts', route: '/notifications', auth: true, icon: 'alerts', center: false, scroll: false },
    { label: 'Profile', route: '/profile', auth: true, icon: 'profile', center: false, scroll: false },
  ] as const;

  const handleTabClick = (tab: typeof tabs[number]) => {
    if (tab.auth && !user) {
      navigate('/login');
      return;
    }
    if (tab.icon === 'explore') {
      if (path === '/') {
        document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/#courses');
      }
      return;
    }
    if (tab.icon === 'alerts') {
      navigate('/dashboard');
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
      <div className="[background-color:color-mix(in_srgb,var(--page-bg)_85%,transparent)] backdrop-blur-2xl border-t t-border">
        <div className="flex items-end justify-around px-2 h-[72px]">
          {tabs.map((tab) => {
            const active = tab.icon === 'explore'
              ? false
              : path === tab.route;

            if (tab.center) {
              return (
                <button
                  key={tab.label}
                  onClick={() => handleTabClick(tab)}
                  className="flex flex-col items-center justify-center -mt-5 relative group focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded-full outline-none"
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Elevated center button */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 ${
                    active
                      ? 'bg-brand-500 scale-110'
                      : 'bg-brand-600 group-active:scale-95'
                  }`}
                    style={{ boxShadow: active ? 'var(--shadow-brand)' : '0 4px 12px rgba(0,0,0,0.5)' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <span className={`text-xs mt-1 mb-1 font-semibold ${active ? 'text-brand-400' : 't-text-2'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={tab.label}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center justify-center py-2 px-3 relative group focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 rounded-lg outline-none"
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                <div className={`transition-all duration-200 ${active ? 'text-brand-400 scale-110' : 't-text-3 group-active:scale-90'}`}
                  style={active ? { filter: 'drop-shadow(0 0 6px rgba(255,59,48,0.5))' } : undefined}
                >
                  <TabIcon name={tab.icon} />
                </div>
                <span className={`text-xs mt-1 font-medium ${active ? 'text-brand-400' : 't-text-3'}`}>
                  {tab.label}
                </span>
                {active && (
                  <div className="absolute -bottom-0 w-1 h-1 rounded-full bg-brand-400" />
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

export default MobileBottomNav;
