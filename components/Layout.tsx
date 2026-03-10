import { Menu, X, LogOut, ShieldAlert, ChevronRight, Youtube, UserCircle, Sun, Moon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import { AnnouncementBanner } from './AnnouncementBanner';
import MobileBottomNav from './MobileBottomNav';
import { NotificationBell } from './NotificationBell';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, login } = useAuth();
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  const handleLogin = async () => {
    await login();
    setIsMenuOpen(false);
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="min-h-screen t-bg t-text flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900">
      <AnnouncementBanner />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b t-nav-border t-nav backdrop-blur-md" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-12">
              <Link to="/" className="flex-shrink-0 z-50 relative flex items-center group" aria-label="Eyebuckz Home">
                <img src="/logo_light.png" alt="Eyebuckz" className="h-7 w-auto invert dark:invert-0" />
              </Link>
              <div className="hidden md:block">
                <div className="flex items-baseline space-x-8" role="menubar">
                  <Link to="/" className="t-text-2 hover:t-text font-medium transition text-sm" role="menuitem">All Courses</Link>
                  <a href="https://youtube.com/@eyebuckz" target="_blank" rel="noreferrer" className="t-text-2 hover:text-[#FF0000] font-medium transition text-sm flex items-center gap-1" role="menuitem" aria-label="Visit our YouTube channel">
                    YouTube
                  </a>
                  {user && (
                    <Link to="/dashboard" className="t-text-2 hover:t-text font-medium transition text-sm" role="menuitem">My Learning</Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className="text-brand-600 hover:text-brand-500 font-medium flex items-center gap-1 transition text-sm" role="menuitem" aria-label="Admin Panel">
                       <ShieldAlert size={14} aria-hidden="true" /> Admin
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Auth */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 gap-3">
                {user ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleTheme}
                      className="p-2 rounded-full hover:bg-[var(--surface-hover)] t-text-2 hover:t-text transition"
                      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                    </button>
                    <NotificationBell />
                    <div className="text-right hidden lg:block">
                        <p className="text-sm font-bold t-text">{user.name}</p>
                        <p className="text-xs t-text-2">{user.email}</p>
                    </div>
                    <Link to="/profile" className="h-10 w-10 rounded-full t-card t-border border flex items-center justify-center shadow-sm hover:border-brand-500 transition" role="img" aria-label={`${user.name}'s profile`}>
                        <span className="font-bold text-sm t-text">{user.name[0]}</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="p-2 rounded-full hover:bg-[var(--surface-hover)] t-text-2 hover:t-text transition"
                      aria-label="Logout"
                      title="Logout"
                    >
                      <LogOut size={20} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleTheme}
                      className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                    </button>
                    <button
                      onClick={handleLogin}
                      className="bg-brand-600 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-brand-500 transition text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      aria-label="Login or sign up to start learning"
                    >
                      Start Learning
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="z-50 relative inline-flex items-center justify-center p-2 rounded-md t-text-2 hover:t-text focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? <X size={28} aria-hidden="true" /> : <Menu size={28} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 t-bg/95 backdrop-blur-xl md:hidden pt-24 px-6 animate-fade-in flex flex-col h-screen" role="dialog" aria-label="Mobile navigation menu">
             <nav className="flex flex-col space-y-2" role="menu">
                <Link to="/" className="flex items-center justify-between p-4 rounded-xl t-card hover:bg-[var(--surface-hover)] transition t-border border" role="menuitem">
                    <span className="text-lg font-medium t-text">Browse Courses</span>
                    <ChevronRight size={20} className="t-text-3" aria-hidden="true" />
                </Link>

                 <a href="https://youtube.com/@eyebuckz" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-xl t-card hover:bg-[var(--surface-hover)] transition t-border border" role="menuitem" aria-label="Visit our YouTube channel">
                    <span className="text-lg font-medium t-text flex items-center gap-2"><Youtube size={20} className="text-red-600" aria-hidden="true"/> YouTube Channel</span>
                    <ChevronRight size={20} className="t-text-3" aria-hidden="true" />
                </a>

                {user && (
                  <>
                    <Link to="/dashboard" className="flex items-center justify-between p-4 rounded-xl t-card hover:bg-[var(--surface-hover)] transition t-border border" role="menuitem">
                        <span className="text-lg font-medium t-text">My Learning</span>
                        <ChevronRight size={20} className="t-text-3" aria-hidden="true" />
                    </Link>
                    <Link to="/profile" className="flex items-center justify-between p-4 rounded-xl t-card hover:bg-[var(--surface-hover)] transition t-border border" role="menuitem">
                        <span className="text-lg font-medium t-text flex items-center gap-2"><UserCircle size={20} aria-hidden="true" /> Profile</span>
                        <ChevronRight size={20} className="t-text-3" aria-hidden="true" />
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link to="/admin" className="flex items-center justify-between p-4 rounded-xl bg-brand-600/10 hover:bg-brand-600/20 transition border border-brand-600/20 text-brand-400" role="menuitem" aria-label="Admin Panel">
                      <span className="text-lg font-medium flex items-center gap-2"><ShieldAlert size={18} aria-hidden="true" /> Admin Panel</span>
                      <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                )}
             </nav>

             <div className="mt-auto mb-10 pb-10 border-t t-border pt-8">
                {user ? (
                   <div className="space-y-4">
                      <div className="flex items-center gap-4 px-2">
                          <div className="h-12 w-12 rounded-full t-bg t-text flex items-center justify-center text-xl font-bold shadow-lg border t-border">
                              {user.name[0]}
                          </div>
                          <div>
                             <p className="font-bold text-lg t-text">{user.name}</p>
                             <p className="text-sm t-text-2">{user.email}</p>
                          </div>
                      </div>
                      <button
                        onClick={logout}
                        className="w-full mt-4 p-4 rounded-xl bg-red-600/10 border border-red-600/20 text-red-400 font-medium flex items-center justify-center gap-2 hover:bg-red-600/20 transition"
                      >
                         <LogOut size={20} /> Logout
                      </button>
                   </div>
                ) : (
                   <button
                    onClick={handleLogin}
                    className="w-full p-4 rounded-xl bg-brand-600 text-white font-bold text-lg shadow-lg hover:bg-brand-500 transition"
                   >
                     Login / Sign Up
                   </button>
                )}
             </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow pb-20 md:pb-0" role="main">
        {children}
      </main>

      {/* Footer */}
      <footer className="t-bg-alt border-t t-border py-16" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-sm">
                <Link to="/" className="flex items-center mb-4">
                    <img src="/logo_light.png" alt="Eyebuckz" className="h-7 w-auto invert dark:invert-0" />
                </Link>
                <p className="t-text-2 text-sm leading-relaxed mb-6">
                    Master the art of filmmaking. From pre-production planning to advanced post-production techniques. Join the community of creators.
                </p>
                <div className="flex gap-4">
                  <a href="#" aria-label="Facebook" className="t-text-3 hover:t-text transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                  <a href="https://youtube.com/@eyebuckz" target="_blank" rel="noreferrer" aria-label="YouTube" className="text-gray-500 hover:text-[#FF0000] transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>
                  </a>
                  <a href="#" aria-label="Instagram" className="t-text-3 hover:t-text transition">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
                </div>
            </div>

            <div className="flex gap-12 md:gap-16 flex-wrap">
                 <div>
                    <h4 className="font-bold t-text mb-4">Courses</h4>
                    <ul className="space-y-3 text-sm t-text-2">
                        <li><Link to="/" className="hover:t-text transition">Filmmaking</Link></li>
                        <li><Link to="/" className="hover:t-text transition">Video Editing</Link></li>
                        <li><Link to="/" className="hover:t-text transition">Photography</Link></li>
                        <li><Link to="/" className="hover:t-text transition">Business</Link></li>
                    </ul>
                 </div>
                 <div>
                    <h4 className="font-bold t-text mb-4">Company</h4>
                    <ul className="space-y-3 text-sm t-text-2">
                        <li><Link to="/about" className="hover:t-text transition">About Us</Link></li>
                        <li><a href="https://youtube.com/@eyebuckz" target="_blank" rel="noreferrer" className="hover:t-text transition">YouTube</a></li>
                    </ul>
                 </div>
                 <div>
                    <h4 className="font-bold t-text mb-4">Support</h4>
                    <ul className="space-y-3 text-sm t-text-2">
                        <li><Link to="/contact" className="hover:t-text transition">Contact Us</Link></li>
                        <li><Link to="/privacy" className="hover:t-text transition">Privacy Policy</Link></li>
                        <li><Link to="/terms" className="hover:t-text transition">Terms of Service</Link></li>
                    </ul>
                 </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t t-border flex flex-col md:flex-row justify-between items-center t-text-3 text-sm gap-4">
            <p>© {new Date().getFullYear()} Eyebuckz. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:t-text transition">Privacy Policy</Link>
              <Link to="/terms" className="hover:t-text transition">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
    </div>
  );
};
