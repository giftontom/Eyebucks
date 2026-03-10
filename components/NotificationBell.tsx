import { Bell, Check, BookOpen, Award, CreditCard, Megaphone } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

const iconMap: Record<string, React.ReactNode> = {
  enrollment: <BookOpen size={16} style={{ color: 'var(--status-success-text)' }} />,
  certificate: <Award size={16} style={{ color: 'var(--status-warning-text)' }} />,
  payment: <CreditCard size={16} style={{ color: 'var(--status-info-text)' }} />,
  announcement: <Megaphone size={16} className="text-brand-400" />,
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) {return 'just now';}
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {return `${minutes}m ago`;}
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {return `${hours}h ago`;}
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {document.addEventListener('mousedown', handleClickOutside);}
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-[var(--surface-hover)] t-text-2 hover:t-text transition focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 outline-none"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] t-card rounded-xl shadow-2xl border t-border z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b t-border">
            <h3 className="font-bold text-sm t-text">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center t-text-2 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-[var(--surface-hover)] transition flex gap-3 border-b t-border last:border-0 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 outline-none ${
                    !n.read ? 'bg-[var(--status-info-bg)]' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {iconMap[n.type] || <Bell size={16} className="t-text-2" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.read ? 'font-semibold t-text' : 't-text-2'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs t-text-2 mt-0.5 truncate">{n.message}</p>
                    <p className="text-[11px] t-text-3 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div className="mt-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-brand-600" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
