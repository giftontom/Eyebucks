/**
 * Courses API - Direct Supabase PostgREST queries
 * Replaces: apiClient.getCourses(), getCourse(), getCourseModules()
 *
 * Content hierarchy: course -> modules (chapters) -> lessons (video leaf).
 */
import { logger } from '../../utils/logger';
import { escapeOrFilter } from '../../utils/supabaseUtils';
import { supabase } from '../supabase';

import type { Course, Module, Lesson, CourseLanguage } from '../../types';
import type { CourseRow, ModuleRow, LessonRow } from '../../types/supabase';

// Query result types for joined queries
interface CourseQueryLesson {
  id: string;
  title: string;
  duration: string | null;
  duration_seconds: number;
  video_url: string | null;
  video_id?: string | null;
  is_free_preview: boolean;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

interface CourseQueryModule {
  id: string;
  title: string;
  order_index: number;
  lessons?: CourseQueryLesson[];
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

/** Count lessons nested under a course's modules (for "N lessons" card stats). */
function countLessons(modules?: { lessons?: { id: string }[] }[]): number {
  return (modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
}

// Map a lesson DB row to the frontend Lesson type
function mapLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    duration: row.duration || '0:00',
    durationSeconds: row.duration_seconds || 0,
    videoUrl: row.video_url || '',
    videoId: row.video_id || undefined,
    isFreePreview: row.is_free_preview || false,
    orderIndex: row.order_index,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// Map a module (chapter) DB row to the frontend Module type, with nested lessons
function mapModule(row: ModuleRow & { lessons?: LessonRow[] }): Module {
  const lessons = (row.lessons || [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map(mapLesson);
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    orderIndex: row.order_index,
    lessons,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
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
    language: (row.language ?? 'EN') as CourseLanguage,
    courseGroupId: row.course_group_id ?? null,
    rating: row.rating,
    totalStudents: row.total_students,
    features: row.features || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    publishedAt: row.published_at ? new Date(row.published_at) : null,
    chapters: row.modules
      ?.slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((m: CourseQueryModule) => ({
        id: m.id,
        title: m.title,
        orderIndex: m.order_index,
        lessons: (m.lessons || [])
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((l: CourseQueryLesson) => ({
            id: l.id,
            title: l.title,
            duration: l.duration || '0:00',
            durationSeconds: l.duration_seconds || 0,
            isFreePreview: l.is_free_preview || false,
            videoUrl: l.video_url || undefined,
          })),
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

export type CourseSort = 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular';

export interface GetCoursesOptions {
  page?: number;
  pageSize?: number;
  /** Filter by course type. Omit for all types. */
  type?: 'BUNDLE' | 'MODULE';
  /** Filter by content language (EN | ML). Omit for all languages. */
  language?: CourseLanguage;
  /** Case-insensitive search across title + description. */
  search?: string;
  /** Minimum rating (1-5). 0 or omitted = no rating filter. */
  minRating?: number;
  /** Maximum price in paise. 0 or omitted = no price cap. */
  maxPrice?: number;
  /** Sort order. Defaults to 'newest'. */
  sort?: CourseSort;
  /** Request the exact filtered total (`count: 'exact'`). Defaults to `true`.
   *  Pass `false` for card lists that don't paginate (landing sections) — it
   *  skips a server-side COUNT(*) over the whole filtered set. */
  withCount?: boolean;
}

export interface GetCoursesResult {
  success: boolean;
  courses: Course[];
  total: number;
  hasMore: boolean;
}

/**
 * In-flight de-duplication for `getCourses`. The landing mounts several
 * sections that each call `getCourses` on the same tick; identical option sets
 * (and accidental re-render refetches) share ONE network round-trip instead of
 * stacking up. The entry is dropped as soon as the promise settles, so this is
 * a request collapser, not a stale cache — results are never reused across a
 * later tick.
 */
const inFlightCourses = new Map<string, Promise<GetCoursesResult>>();

export const coursesApi = {
  /**
   * Lightweight published-course count via a HEAD request (no rows, no joins,
   * no bundle resolution). Use this when only the number matters — e.g. the
   * hero "N+ Courses" stat — instead of fetching a full page just to read
   * `.total`.
   */
  async getCourseCount(language?: CourseLanguage): Promise<number> {
    let query = supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PUBLISHED');
    if (language) { query = query.eq('language', language); }
    const { count, error } = await query;
    if (error) { throw new Error(error.message); }
    return count ?? 0;
  },

  /**
   * Fetches published courses with pagination support.
   *
   * For BUNDLE-type courses, performs a two-step query to avoid PostgREST FK-hint
   * ambiguity: first fetches bundle_courses links, then fetches the bundled course details.
   *
   * @returns Object containing `success: true` and an array of published `Course` objects
   *   ordered by `created_at` descending. Each BUNDLE course includes `bundledCourses`.
   * @throws {Error} If the main courses query fails.
   */
  getCourses(options: GetCoursesOptions = {}): Promise<GetCoursesResult> {
    // Collapse concurrent identical calls (several landing sections fetch on
    // the same tick) into one round-trip.
    const key = JSON.stringify(options);
    const pending = inFlightCourses.get(key);
    if (pending) { return pending; }
    const promise = coursesApi._getCoursesUncached(options).finally(() => {
      inFlightCourses.delete(key);
    });
    inFlightCourses.set(key, promise);
    return promise;
  },

  async _getCoursesUncached(options: GetCoursesOptions = {}): Promise<GetCoursesResult> {
    const { page = 1, pageSize = 12, type, language, search, minRating = 0, maxPrice = 0, sort = 'newest', withCount = true } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Map sort option → column + direction.
    const SORT_COLUMNS: Record<CourseSort, { column: string; ascending: boolean }> = {
      'newest': { column: 'created_at', ascending: false },
      'price-asc': { column: 'price', ascending: true },
      'price-desc': { column: 'price', ascending: false },
      'rating': { column: 'rating', ascending: false },
      'popular': { column: 'total_students', ascending: false },
    };
    const orderBy = SORT_COLUMNS[sort] ?? SORT_COLUMNS.newest;

    // Card lists only need the module COUNT (chapters?.length), so join just
    // `modules(id)` — not the full module rows. `withCount` adds the exact
    // filtered total only when a caller paginates on it.
    let query = supabase
      .from('courses')
      // Card lists need chapter + lesson COUNTS, so join `modules(id, lessons(id))`.
      .select('*, modules(id, lessons(id))', withCount ? { count: 'exact' } : undefined)
      .eq('status', 'PUBLISHED');

    if (type) { query = query.eq('type', type); }
    if (language) { query = query.eq('language', language); }
    if (minRating > 0) { query = query.gte('rating', minRating); }
    if (maxPrice > 0) { query = query.lte('price', maxPrice); }
    if (search?.trim()) {
      const s = escapeOrFilter(search.trim());
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
    }

    const { data, count, error } = await query
      .order(orderBy.column, { ascending: orderBy.ascending, nullsFirst: false })
      .range(from, to);

    if (error) {throw new Error(error.message);}
    const total = withCount ? (count ?? 0) : (data?.length ?? 0);

    // The list query joins a lighter module/lesson shape than CourseQueryRow's full
    // lessons; mapCourse only reads ids/order here (chapter + lesson counts), cast is sound.
    const rows = (data || []) as unknown as CourseQueryRow[];
    const courses = rows.map(mapCourse);

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
          .select('id, title, slug, thumbnail, modules(id, lessons(id))')
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
                    lessonCount: countLessons(c.modules as { lessons?: { id: string }[] }[]),
                  };
                });
            }
          }
        }
      }
    }

    return { success: true, courses, total, hasMore: from + pageSize < total };
  },

  /**
   * Fetches a single course by UUID or slug, including all chapters/lessons and reviews.
   *
   * Uses a UUID regex to detect the lookup strategy: UUID → query by `id`,
   * non-UUID string → query by `slug`. Chapters are sorted by `order_index`, and
   * each chapter's lessons are sorted by `order_index`.
   * For BUNDLE courses, fetches bundled course details in a second query.
   *
   * @param idOrSlug - The course UUID or slug.
   * @returns Object containing `success: true` and the full `Course` object.
   * @throws {Error} If the course does not exist or the database query fails.
   */
  async getCourse(idOrSlug: string): Promise<{ success: boolean; course: Course }> {
    // Try by ID first, then by slug
    let query = supabase
      .from('courses')
      .select(`
        *,
        modules(id, title, order_index, created_at, updated_at, lessons(id, title, duration, duration_seconds, video_url, video_id, is_free_preview, order_index, created_at, updated_at)),
        reviews(id, rating, comment, created_at, user_id, users(name))
      `);

    // Determine if it's an ID or slug (UUID detection)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      query = query.eq('id', idOrSlug);
    } else {
      // May be a slug OR a non-UUID string ID (e.g., seed data uses readable IDs like 'c3-cinematography')
      query = query.or(`slug.eq.${escapeOrFilter(idOrSlug)},id.eq.${escapeOrFilter(idOrSlug)}`);
    }

    const { data, error } = await query.single();

    if (error) {throw new Error(error.message);}

    const course = mapCourse(data as unknown as CourseQueryRow);

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
          .select('id, title, slug, description, thumbnail, price, rating, total_students, modules(id, lessons(id))')
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
                lessonCount: countLessons(c.modules as { lessons?: { id: string }[] }[]),
              };
            });
        }
      }

      // Also hydrate any bundled digital assets (published only; RLS hides drafts).
      const { data: assetLinks, error: assetLinksError } = await supabase
        .from('bundle_assets')
        .select('asset_id')
        .eq('bundle_id', data.id)
        .order('order_index', { ascending: true });

      if (assetLinksError) {
        logger.error('[getCourse] bundle_assets query failed:', assetLinksError);
      } else if (assetLinks && assetLinks.length > 0) {
        const assetIds = assetLinks.map(r => r.asset_id);
        const { data: assetData, error: assetError } = await supabase
          .from('digital_assets')
          .select('id, slug, title, thumbnail, file_type, license, price, status, deleted_at')
          .in('id', assetIds)
          .eq('status', 'PUBLISHED')
          .is('deleted_at', null);

        if (assetError) {
          logger.error('[getCourse] bundled asset details query failed:', assetError);
        } else if (assetData) {
          const assetMap = new Map(assetData.map(a => [a.id, a]));
          course.bundledAssets = assetIds
            .filter(id => assetMap.has(id))
            .map(id => {
              const a = assetMap.get(id)!;
              return {
                id: a.id,
                slug: a.slug,
                title: a.title,
                thumbnail: a.thumbnail || '',
                fileType: a.file_type,
                license: a.license,
                price: a.price || 0,
              };
            });
        }
      }
    }

    return { success: true, course };
  },

  /**
   * Fetches all chapters (modules) with their lessons for a course, redacting video
   * URLs/GUIDs on locked lessons for non-enrolled users.
   *
   * Checks enrollment and admin role to determine `hasAccess`. If the user does not have
   * access, `videoUrl`/`videoId` are cleared on every non-free-preview lesson. Free-preview
   * lessons always keep their video.
   *
   * @param courseId - UUID of the course to fetch modules for.
   * @returns Object with `modules` array (each with nested `lessons`, all sorted by
   *   `order_index`), `hasAccess` boolean, and `success: true`.
   * @throws {Error} If the modules query fails.
   */
  async getCourseModules(courseId: string): Promise<{ success: boolean; modules: Module[]; hasAccess: boolean }> {
    // Parallelize: modules+lessons fetch + auth user lookup run concurrently
    const [modulesResult, authResult] = await Promise.all([
      supabase
        .from('modules')
        .select('*, lessons(*)')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true }),
      supabase.auth.getUser(),
    ]);

    if (modulesResult.error) {throw new Error(modulesResult.error.message);}

    // Check access - RLS handles visibility, but we check enrollment for video URLs
    const authUser = authResult.data?.user;
    let hasAccess = false;

    if (authUser) {
      // Parallelize enrollment check + role check
      const [enrollmentResult, profileResult] = await Promise.all([
        supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('course_id', courseId)
          .eq('status', 'ACTIVE')
          .maybeSingle(),
        supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle(),
      ]);

      hasAccess = !!enrollmentResult.data || profileResult.data?.role === 'ADMIN';
    }

    const modules = (modulesResult.data || []).map(m => mapModule(m as ModuleRow & { lessons?: LessonRow[] }));

    // Redact video URLs and GUIDs on locked lessons for non-enrolled users
    if (!hasAccess) {
      modules.forEach(m => {
        m.lessons?.forEach(l => {
          if (!l.isFreePreview) {
            l.videoUrl = '';
            l.videoId = undefined;
          }
        });
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
