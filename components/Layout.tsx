import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, ShieldAlert, ChevronRight, Aperture, Youtube, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-md" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-12">
              <Link to="/" className="flex-shrink-0 z-50 relative flex items-center gap-2 group" aria-label="Eyebuckz Home">
                <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
                    <span className="font-bold text-lg" aria-hidden="true">E</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-neutral-900 group-hover:text-brand-600 transition-colors">
                  Eyebuckz
                </span>
              </Link>
              <div className="hidden md:block">
                <div className="flex items-baseline space-x-8" role="menubar">
                  <Link to="/" className="text-neutral-600 hover:text-black font-medium transition text-sm" role="menuitem">All Courses</Link>
                  <a href="https://youtube.com/@eyebuckz" target="_blank" rel="noreferrer" className="text-neutral-600 hover:text-[#FF0000] font-medium transition text-sm flex items-center gap-1" role="menuitem" aria-label="Visit our YouTube channel">
                    YouTube
                  </a>
                  {user && (
                    <Link to="/dashboard" className="text-neutral-600 hover:text-black font-medium transition text-sm" role="menuitem">My Learning</Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1 transition text-sm" role="menuitem" aria-label="Admin Panel">
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
                    <NotificationBell />
                    <div className="text-right hidden lg:block">
                        <p className="text-sm font-bold text-neutral-900">{user.name}</p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                    </div>
                    <Link to="/profile" className="h-10 w-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shadow-sm hover:border-brand-300 transition" role="img" aria-label={`${user.name}'s profile`}>
                        <span className="font-bold text-sm text-neutral-700">{user.name[0]}</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition"
                      aria-label="Logout"
                      title="Logout"
                    >
                      <LogOut size={20} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="bg-black text-white px-6 py-2.5 rounded-full font-semibold hover:bg-neutral-800 transition text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    aria-label="Login or sign up to start learning"
                  >
                    Start Learning
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="z-50 relative inline-flex items-center justify-center p-2 rounded-md text-neutral-600 hover:text-black focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-600"
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
          <div className="fixed inset-0 z-40 bg-white md:hidden pt-24 px-6 animate-fade-in flex flex-col h-screen" role="dialog" aria-label="Mobile navigation menu">
             <nav className="flex flex-col space-y-2" role="menu">
                <Link to="/" className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-100" role="menuitem">
                    <span className="text-lg font-medium">Browse Courses</span>
                    <ChevronRight size={20} className="text-neutral-400" aria-hidden="true" />
                </Link>
                
                 <a href="https://youtube.com/@eyebuckz" target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-100" role="menuitem" aria-label="Visit our YouTube channel">
                    <span className="text-lg font-medium flex items-center gap-2"><Youtube size={20} className="text-red-600" aria-hidden="true"/> YouTube Channel</span>
                    <ChevronRight size={20} className="text-neutral-400" aria-hidden="true" />
                </a>

                {user && (
                  <>
                    <Link to="/dashboard" className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-100" role="menuitem">
                        <span className="text-lg font-medium">My Learning</span>
                        <ChevronRight size={20} className="text-neutral-400" aria-hidden="true" />
                    </Link>
                    <Link to="/profile" className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition border border-neutral-100" role="menuitem">
                        <span className="text-lg font-medium flex items-center gap-2"><UserCircle size={20} aria-hidden="true" /> Profile</span>
                        <ChevronRight size={20} className="text-neutral-400" aria-hidden="true" />
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <Link to="/admin" className="flex items-center justify-between p-4 rounded-xl bg-brand-50 hover:bg-brand-100 transition border border-brand-200 text-brand-600" role="menuitem" aria-label="Admin Panel">
                      <span className="text-lg font-medium flex items-center gap-2"><ShieldAlert size={18} aria-hidden="true" /> Admin Panel</span>
                      <ChevronRight size={20} aria-hidden="true" />
                  </Link>
                )}
             </nav>

             <div className="mt-auto mb-10 pb-10 border-t border-neutral-100 pt-8">
                {user ? (
                   <div className="space-y-4">
                      <div className="flex items-center gap-4 px-2">
                          <div className="h-12 w-12 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold shadow-lg">
                              {user.name[0]}
                          </div>
                          <div>
                             <p className="font-bold text-lg text-neutral-900">{user.name}</p>
                             <p className="text-sm text-neutral-500">{user.email}</p>
                          </div>
                      </div>
                      <button 
                        onClick={logout} 
                        className="w-full mt-4 p-4 rounded-xl bg-red-50 text-red-600 font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition"
                      >
                         <LogOut size={20} /> Logout
                      </button>
                   </div>
                ) : (
                   <button 
                    onClick={handleLogin} 
                    className="w-full p-4 rounded-xl bg-black text-white font-bold text-lg shadow-lg"
                   >
                     Login / Sign Up
                   </button>
                )}
             </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow" role="main">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-50 border-t border-neutral-200 py-16" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-sm">
                <Link to="/" className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-black text-white rounded flex items-center justify-center">
                        <span className="font-bold text-xs">E</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight text-neutral-900">
                    Eyebuckz
                    </span>
                </Link>
                <p className="text-neutral-500 text-sm leading-relaxed">
                    Master the art of filmmaking. From pre-production planning to advanced post-production techniques. Join the community of creators.
                </p>
            </div>
            
            <div className="flex gap-16">
                 <div>
                    <h4 className="font-bold text-neutral-900 mb-4">Platform</h4>
                    <ul className="space-y-3 text-sm text-neutral-500">
                        <li><Link to="/" className="hover:text-black transition">Browse Courses</Link></li>
                    </ul>
                 </div>
                 <div>
                    <h4 className="font-bold text-neutral-900 mb-4">Community</h4>
                    <ul className="space-y-3 text-sm text-neutral-500">
                        <li><a href="https://youtube.com/@eyebuckz" target="_blank" rel="noreferrer" className="hover:text-[#FF0000] transition">YouTube</a></li>
                    </ul>
                 </div>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center text-neutral-400 text-sm gap-4">
            <p>© {new Date().getFullYear()} Eyebuckz. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-neutral-600 transition">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-neutral-600 transition">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};