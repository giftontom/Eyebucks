/**
 * Courses API - Direct Supabase PostgREST queries
 * Replaces: apiClient.getCourses(), getCourse(), getCourseModules()
 */
import { supabase } from '../supabase';
import type { Course, Module } from '../../types';
import type { CourseRow, ModuleRow } from '../../types/supabase';

// Query result types for joined queries
interface CourseQueryModule {
  id: string;
  title: string;
  duration: string | null;
  duration_seconds: number;
  video_url: string | null;
  is_free_preview: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

interface CourseQueryReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  users: { name: string } | null;
}

type CourseQueryRow = CourseRow & {
  modules?: CourseQueryModule[];
  reviews?: CourseQueryReview[];
};

interface BundleQueryCourse {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnail: string;
  price?: number;
  rating?: number | null;
  total_students?: number;
  modules?: { id: string }[];
}

interface BundleQueryRow {
  bundle_id: string;
  course_id: string;
  courses: BundleQueryCourse;
}

// Map DB row to frontend Course type
function mapCourse(row: CourseQueryRow): Course {
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
    chapters: row.modules?.map((m: CourseQueryModule) => ({
      id: m.id,
      title: m.title,
      duration: m.duration,
      durationSeconds: m.duration_seconds,
      videoUrl: m.video_url,
    })),
    reviews: row.reviews?.map((r: CourseQueryReview) => ({
      id: r.id,
      user: r.users?.name || 'Anonymous',
      rating: r.rating,
      comment: r.comment || '',
      date: r.created_at,
    })),
  };
}

function mapModule(row: ModuleRow): Module {
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

    const courses = (data || []).map(mapCourse);

    // For BUNDLE courses, fetch bundled course counts
    const bundleIds = (data || []).filter(c => c.type === 'BUNDLE').map(c => c.id);
    if (bundleIds.length > 0) {
      const { data: bundleRows } = await supabase
        .from('bundle_courses')
        .select('bundle_id, course_id, courses!bundle_courses_course_id_fkey(id, title, slug, thumbnail, modules(id))')
        .in('bundle_id', bundleIds)
        .order('order_index', { ascending: true });

      if (bundleRows) {
        const bundleMap = new Map<string, BundleQueryRow[]>();
        for (const row of bundleRows as unknown as BundleQueryRow[]) {
          const list = bundleMap.get(row.bundle_id) || [];
          list.push(row);
          bundleMap.set(row.bundle_id, list);
        }
        for (const course of courses) {
          if (course.type === 'BUNDLE') {
            const rows = bundleMap.get(course.id) || [];
            course.bundledCourses = rows.map((r: BundleQueryRow) => ({
              id: r.courses.id,
              title: r.courses.title,
              slug: r.courses.slug,
              description: '',
              thumbnail: r.courses.thumbnail || '',
              price: 0,
              rating: null,
              totalStudents: 0,
              moduleCount: r.courses.modules?.length || 0,
            }));
          }
        }
      }
    }

    return { success: true, courses };
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

    // Determine if it's an ID or slug (UUID detection)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid || idOrSlug.startsWith('c')) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Course not found');

    // Sort modules by order_index
    if (data.modules) {
      data.modules.sort((a: CourseQueryModule, b: CourseQueryModule) => a.order_index - b.order_index);
    }

    const course = mapCourse(data);

    // For BUNDLE courses, fetch bundled course details
    if (data.type === 'BUNDLE') {
      const { data: bundleRows } = await supabase
        .from('bundle_courses')
        .select('course_id, courses!bundle_courses_course_id_fkey(id, title, slug, description, thumbnail, price, rating, total_students, modules(id))')
        .eq('bundle_id', data.id)
        .order('order_index', { ascending: true });

      if (bundleRows) {
        course.bundledCourses = (bundleRows as unknown as BundleQueryRow[]).map((r: BundleQueryRow) => ({
          id: r.courses.id,
          title: r.courses.title,
          slug: r.courses.slug,
          description: r.courses.description || '',
          thumbnail: r.courses.thumbnail || '',
          price: r.courses.price || 0,
          rating: r.courses.rating ?? null,
          totalStudents: r.courses.total_students || 0,
          moduleCount: r.courses.modules?.length || 0,
        }));
      }
    }

    return { success: true, course };
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

  /**
   * Get courses by IDs (for dashboard enrolled course display)
   */
  async getCoursesByIds(ids: string[]): Promise<{ id: string; title: string; thumbnail: string; type: string; description: string }[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('courses')
      .select('id, title, thumbnail, type, description')
      .in('id', ids);

    if (error) throw new Error(error.message);
    return data || [];
  },
};
