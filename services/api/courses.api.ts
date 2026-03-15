/**
 * Courses API - Direct Supabase PostgREST queries
 * Replaces: apiClient.getCourses(), getCourse(), getCourseModules()
 */
import { supabase } from '../supabase';
import { logger } from '../../utils/logger';

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
    videoId: row.video_id || undefined,
    isFreePreview: row.is_free_preview || false,
    orderIndex: row.order_index,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const coursesApi = {
  /**
   * Fetches all published courses with their modules and bundle contents.
   *
   * For BUNDLE-type courses, performs a two-step query to avoid PostgREST FK-hint
   * ambiguity: first fetches bundle_courses links, then fetches the bundled course details.
   *
   * @returns Object containing `success: true` and an array of published `Course` objects
   *   ordered by `created_at` descending. Each BUNDLE course includes `bundledCourses`.
   * @throws {Error} If the main courses query fails.
   *
   * @example
   * ```ts
   * const { courses } = await coursesApi.getCourses();
   * const bundles = courses.filter(c => c.type === 'BUNDLE');
   * ```
   */
  async getCourses(): Promise<{ success: boolean; courses: Course[] }> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(id, title, duration, duration_seconds, video_url, is_free_preview, order_index)')
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (error) {throw new Error(error.message);}

    const courses = (data || []).map(mapCourse);

    // For BUNDLE courses, fetch bundled course counts (two-step to avoid FK-hint issues)
    const bundleIds = (data || []).filter(c => c.type === 'BUNDLE').map(c => c.id);
    if (bundleIds.length > 0) {
      const { data: links, error: linksError } = await supabase
        .from('bundle_courses')
        .select('bundle_id, course_id')
        .in('bundle_id', bundleIds)
        .order('order_index', { ascending: true });

      if (linksError) {
        logger.error('[getCourses] bundle_courses query failed:', linksError);
      } else if (links && links.length > 0) {
        const allCourseIds = [...new Set(links.map(r => r.course_id))];
        const { data: bundledData, error: bundledError } = await supabase
          .from('courses')
          .select('id, title, slug, thumbnail, modules(id)')
          .in('id', allCourseIds);

        if (bundledError) {
          logger.error('[getCourses] bundled course details query failed:', bundledError);
        } else if (bundledData) {
          const courseMap = new Map(bundledData.map(c => [c.id, c]));
          // Group links by bundle_id preserving order
          const bundleMap = new Map<string, string[]>();
          for (const row of links) {
            const list = bundleMap.get(row.bundle_id) || [];
            list.push(row.course_id);
            bundleMap.set(row.bundle_id, list);
          }
          for (const course of courses) {
            if (course.type === 'BUNDLE') {
              const courseIds = bundleMap.get(course.id) || [];
              course.bundledCourses = courseIds
                .filter(id => courseMap.has(id))
                .map(id => {
                  const c = courseMap.get(id)!;
                  return {
                    id: c.id,
                    title: c.title,
                    slug: c.slug,
                    description: '',
                    thumbnail: c.thumbnail || '',
                    price: 0,
                    rating: null,
                    totalStudents: 0,
                    moduleCount: (c.modules as {id: string}[])?.length || 0,
                  };
                });
            }
          }
        }
      }
    }

    return { success: true, courses };
  },

  /**
   * Fetches a single course by UUID or slug, including all modules and reviews.
   *
   * Uses a UUID regex to detect the lookup strategy: UUID → query by `id`,
   * non-UUID string → query by `slug`. Modules are sorted by `order_index`.
   * For BUNDLE courses, fetches bundled course details in a second query.
   *
   * @param idOrSlug - The course UUID (e.g., `'abc-123-...'`) or slug (e.g., `'intro-to-react'`).
   * @returns Object containing `success: true` and the full `Course` object with modules and reviews.
   * @throws {Error} If the course does not exist or the database query fails.
   *
   * @example
   * ```ts
   * const { course } = await coursesApi.getCourse('intro-to-react');
   * console.log(course.chapters?.length); // number of modules
   * ```
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
    if (isUuid) {
      query = query.eq('id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.single();

    if (error) {throw new Error(error.message);}
    if (!data) {throw new Error('Course not found');}

    // Sort modules by order_index
    if (data.modules) {
      data.modules.sort((a: CourseQueryModule, b: CourseQueryModule) => a.order_index - b.order_index);
    }

    const course = mapCourse(data);

    // For BUNDLE courses, fetch bundled course details (two-step to avoid FK-hint issues)
    if (data.type === 'BUNDLE') {
      const { data: links, error: linksError } = await supabase
        .from('bundle_courses')
        .select('course_id')
        .eq('bundle_id', data.id)
        .order('order_index', { ascending: true });

      if (linksError) {
        logger.error('[getCourse] bundle_courses query failed:', linksError);
      } else if (links && links.length > 0) {
        const courseIds = links.map(r => r.course_id);
        const { data: bundledData, error: bundledError } = await supabase
          .from('courses')
          .select('id, title, slug, description, thumbnail, price, rating, total_students, modules(id)')
          .in('id', courseIds);

        if (bundledError) {
          logger.error('[getCourse] bundled course details query failed:', bundledError);
        } else if (bundledData) {
          const courseMap = new Map(bundledData.map(c => [c.id, c]));
          course.bundledCourses = courseIds
            .filter(id => courseMap.has(id))
            .map(id => {
              const c = courseMap.get(id)!;
              return {
                id: c.id,
                title: c.title,
                slug: c.slug,
                description: c.description || '',
                thumbnail: c.thumbnail || '',
                price: c.price || 0,
                rating: c.rating ?? null,
                totalStudents: c.total_students || 0,
                moduleCount: (c.modules as {id: string}[])?.length || 0,
              };
            });
        }
      }
    }

    return { success: true, course };
  },

  /**
   * Fetches all modules for a course, redacting video URLs for non-enrolled users.
   *
   * Checks enrollment and admin role to determine `hasAccess`. If the user does not have
   * access, `videoUrl` is set to `''` on all non-free-preview modules. Free preview
   * modules always have their video URL included.
   *
   * @param courseId - UUID of the course to fetch modules for.
   * @returns Object with `modules` array (sorted by `order_index`), `hasAccess` boolean,
   *   and `success: true`.
   * @throws {Error} If the modules query fails.
   *
   * @example
   * ```ts
   * const { modules, hasAccess } = await coursesApi.getCourseModules(courseId);
   * if (!hasAccess) {
   *   // Only free preview modules will have videoUrl populated
   * }
   * ```
   */
  async getCourseModules(courseId: string): Promise<{ success: boolean; modules: Module[]; hasAccess: boolean }> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) {throw new Error(error.message);}

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

    // Redact video URLs and GUIDs for non-enrolled users (except free previews)
    if (!hasAccess) {
      modules.forEach(m => {
        if (!m.isFreePreview) {
          m.videoUrl = '';
          m.videoId = undefined;
        }
      });
    }

    return { success: true, modules, hasAccess };
  },

  /**
   * Fetches lightweight course data for a batch of course IDs.
   *
   * Used by the Dashboard to display enrolled course cards without fetching full
   * module/review data. Returns only the fields needed for the course card UI.
   *
   * @param ids - Array of course UUIDs to fetch. Returns `[]` immediately if empty.
   * @returns Array of objects with `id`, `title`, `thumbnail`, `type`, and `description`.
   * @throws {Error} If the database query fails.
   *
   * @example
   * ```ts
   * const courses = await coursesApi.getCoursesByIds(enrollments.map(e => e.courseId));
   * ```
   */
  async getCoursesByIds(ids: string[]): Promise<{ id: string; title: string; thumbnail: string; type: string; description: string }[]> {
    if (ids.length === 0) {return [];}

    const { data, error } = await supabase
      .from('courses')
      .select('id, title, thumbnail, type, description')
      .in('id', ids);

    if (error) {throw new Error(error.message);}
    return data || [];
  },
};
