/**
 * Real-time notifications hook using Supabase Realtime
 * Subscribes to new notifications for the current user
 */
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import type { Notification } from '../services/api/notifications.api';

interface UseRealtimeNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useRealtimeNotifications = (): UseRealtimeNotificationsResult => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.id;

  const fetchNotifications = async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const mapped: Notification[] = data.map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.created_at,
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter(n => !n.read).length);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif: Notification = {
            id: payload.new.id,
            userId: payload.new.user_id,
            type: payload.new.type,
            title: payload.new.title,
            message: payload.new.message,
            link: payload.new.link,
            read: payload.new.read,
            createdAt: payload.new.created_at,
          };
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
};
