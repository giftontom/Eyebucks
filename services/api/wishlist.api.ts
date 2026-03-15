import { supabase } from '../supabase';

export interface WishlistEntry {
  id: string;
  courseId: string;
  createdAt: Date;
}

export const wishlistApi = {
  async list(): Promise<WishlistEntry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return []; }
    const { data, error } = await supabase
      .from('wishlists')
      .select('id, course_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) { throw new Error(error.message, { cause: error }); }
    return (data || []).map(r => ({
      id: r.id,
      courseId: r.course_id,
      createdAt: new Date(r.created_at),
    }));
  },

  async add(courseId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { throw new Error('Not authenticated'); }
    const { error } = await supabase
      .from('wishlists')
      .insert({ course_id: courseId, user_id: user.id });

    if (error && error.code !== '23505') { throw new Error(error.message, { cause: error }); } // ignore duplicate
  },

  async remove(courseId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { throw new Error('Not authenticated'); }
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', user.id);

    if (error) { throw new Error(error.message, { cause: error }); }
  },
};
