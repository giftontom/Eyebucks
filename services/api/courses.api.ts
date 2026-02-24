/**
 * Courses API - Direct Supabase PostgREST queries
 * Replaces: apiClient.getCourses(), getCourse(), getCourseModules()
 */
import { supabase } from '../supabase';
import type { Course, Module } from '../../types';

// Map DB row to frontend Course type
function mapCourse(row: any): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    price: row.price,
    thumbnail: row.thumbnail || '',
    heroVideoId: row.hero_video_id,
    type: row.type,
    status: row.status,
    rating: row.rating,
    totalStudents: row.total_students,
    features: row.features || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    chapters: row.modules?.map((m: any) => ({
      id: m.id,
      title: m.title,
      duration: m.duration,
      durationSeconds: m.duration_seconds,
      videoUrl: m.video_url,
    })),
    reviews: row.reviews?.map((r: any) => ({
      id: r.id,
      user: r.users?.name || 'Anonymous',
      rating: r.rating,
      comment: r.comment || '',
      date: r.created_at,
    })),
  };
}

function mapModule(row: any): Module {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    duration: row.duration || '0:00',
    durationSeconds: row.duration_seconds || 0,
    videoUrl: row.video_url || '',
    isFreePreview: row.is_free_preview || false,
    orderIndex: row.order_index,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const coursesApi = {
  /**
   * Get all published courses
   */
  async getCourses(): Promise<{ success: boolean; courses: Course[] }> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(id, title, duration, duration_seconds, video_url, is_free_preview, order_index)')
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { success: true, courses: (data || []).map(mapCourse) };
  },

  /**
   * Get a single course by ID or slug
   */
  async getCourse(idOrSlug: string): Promise<{ success: boolean; course: Course }> {
    // Try by ID first, then by slug
    let query = supabase
      .from('courses')
      .select(`
        *,
        modules(id, title, duration, duration_seconds, video_url, is_free_preview, order_index, created_at, updated_at),
        reviews(id, rating, comment, created_at, user_id, users(name))
      `);

    // Determine if it's an ID or slug
    if (idOrSlug.startsWith('c') || idOrSlug.length < 30) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Course not found');

    // Sort modules by order_index
    if (data.modules) {
      data.modules.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return { success: true, course: mapCourse(data) };
  },

  /**
   * Get course modules
   */
  async getCourseModules(courseId: string): Promise<{ success: boolean; modules: Module[]; hasAccess: boolean }> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(error.message);

    // Check access - RLS handles visibility, but we check enrollment for video URLs
    const { data: { user } } = await supabase.auth.getUser();
    let hasAccess = false;

    if (user) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      // Check admin
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      hasAccess = !!enrollment || profile?.role === 'ADMIN';
    }

    const modules = (data || []).map(mapModule);

    // Redact video URLs for non-enrolled users (except free previews)
    if (!hasAccess) {
      modules.forEach(m => {
        if (!m.isFreePreview) {
          m.videoUrl = '';
        }
      });
    }

    return { success: true, modules, hasAccess };
  },
};
