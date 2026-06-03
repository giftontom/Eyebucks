import { Bell, Check, BookOpen, Award, CreditCard, Megaphone, TrendingUp, Star } from 'lucide-react';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

import type { Notification } from '../services/api/notifications.api';

const iconMap: Record<string, React.ReactNode> = {
  enrollment: <BookOpen size={18} style={{ color: 'var(--status-success-text)' }} />,
  milestone: <TrendingUp size={18} style={{ color: 'var(--status-warning-text)' }} />,
  certificate: <Award size={18} style={{ color: 'var(--status-warning-text)' }} />,
  payment: <CreditCard size={18} style={{ color: 'var(--status-info-text)' }} />,
  announcement: <Megaphone size={18} className="text-brand-400" />,
  review: <Star size={18} style={{ color: 'var(--status-warning-text)' }} />,
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) { return 'just now'; }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) { return `${minutes}m ago`; }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) { return `${hours}h ago`; }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Full-page notification inbox — the mobile-accessible counterpart to the desktop
 * `NotificationBell` dropdown. Reached via the "Alerts" tab in `MobileBottomNav`
 * and the bell's "See all notifications" link. Reuses `useRealtimeNotifications`.
 */
export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useRealtimeNotifications();

  const handleClick = (n: Notification) => {
    if (!n.read) { markAsRead(n.id); }
    if (n.link) { navigate(n.link); }
  };

  return (
    <>
      <Helmet><title>Notifications — Eyebuckz Academy</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 min-h-[60vh]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold t-text">Notifications</h1>
            {unreadCount > 0 && <p className="text-sm t-text-2 mt-0.5">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1.5"
            >
              <Check size={15} /> Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="t-card t-border border rounded-xl p-4 flex gap-3 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-[var(--surface-hover)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[var(--surface-hover)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--surface-hover)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 t-card rounded-2xl t-border border">
            <Bell size={40} className="mx-auto mb-4 t-text-3" />
            <p className="text-lg font-bold t-text mb-1">No notifications yet</p>
            <p className="t-text-2">Enrollments, certificates, and updates will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left t-card t-border border rounded-xl p-4 hover:bg-[var(--surface-hover)] transition flex gap-3.5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 outline-none ${
                  !n.read ? 'border-l-2 border-l-brand-500' : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">{iconMap[n.type] || <Bell size={18} className="t-text-2" />}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? 'font-semibold t-text' : 't-text'}`}>{n.title}</p>
                  <p className="text-sm t-text-2 mt-0.5">{n.message}</p>
                  <p className="text-xs t-text-3 mt-1.5">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <div className="mt-1.5 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
Notifications.displayName = 'Notifications';
