/**
 * Users API - User profile operations
 */
import { supabase } from '../supabase';
import type { User } from '../../types';
import type { UserRow } from '../../types/supabase';

export function mapUserProfile(profile: UserRow): User {
  return {
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    avatar: profile.avatar || '',
    phone_e164: profile.phone_e164 || null,
    role: profile.role || 'USER',
    phoneVerified: profile.phone_verified || false,
    emailVerified: profile.email_verified || false,
    google_id: profile.google_id ?? undefined,
    created_at: profile.created_at ? new Date(profile.created_at) : undefined,
    last_login_at: profile.last_login_at ? new Date(profile.last_login_at) : undefined,
  };
}

export const usersApi = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return null;

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error || !profile) return null;

    return mapUserProfile(profile);
  },

  async getUser(userId: string): Promise<Pick<User, 'id' | 'name' | 'email' | 'avatar' | 'role' | 'created_at'> | null> {
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, name, email, avatar, role, created_at')
      .eq('id', userId)
      .single();

    if (error || !profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar || '',
      role: profile.role,
      created_at: profile.created_at ? new Date(profile.created_at) : undefined,
    };
  },

  async updatePhone(userId: string, phone: string): Promise<void> {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      throw new Error('Invalid E.164 format. Phone must start with + and country code.');
    }

    const { error } = await supabase
      .from('users')
      .update({ phone_e164: phone, phone_verified: true })
      .eq('id', userId);

    if (error) throw new Error('Failed to update phone number');
  },

  async updateProfile(userId: string, data: { name?: string }): Promise<void> {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;

    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId);

    if (error) throw new Error('Failed to update profile');
  },
};
