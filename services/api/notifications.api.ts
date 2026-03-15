/**
 * Notifications API - Direct Supabase PostgREST queries
 * Replaces: apiClient notification methods
 */
import { logger } from '../../utils/logger';
import { supabase } from '../supabase';

import type { NotificationRow } from '../../types/supabase';

export interface Notification {
  id: string;
  userId: string;
  type: 'enrollment' | 'milestone' | 'certificate' | 'announcement' | 'review';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function mapNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    read: row.read,
    createdAt: row.created_at,
  };
}

export const notificationsApi = {
  /**
   * Get user's notifications
   */
  async getNotifications(limit: number = 20): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {throw new Error(error.message);}
    return (data || []).map(mapNotification);
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (error) {throw new Error(error.message);}
    return count || 0;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) {logger.error('[Notifications] markAsRead failed:', error);}
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return;}

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) {logger.error('[Notifications] markAllAsRead failed:', error);}
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) {logger.error('[Notifications] deleteNotification failed:', error);}
  },
};
