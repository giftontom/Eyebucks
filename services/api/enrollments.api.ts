/**
 * Enrollments API - Direct Supabase PostgREST queries
 * Replaces: enrollmentService + apiClient enrollment methods
 */
import { supabase } from '../supabase';

import type { Enrollment, EnrollmentWithCourse } from '../../types';
import type { EnrollmentRow, EnrollmentUpdate } from '../../types/supabase';

function mapEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    enrolledAt: new Date(row.enrolled_at),
    lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : null,
    status: row.status,
    paymentId: row.payment_id,
    orderId: row.order_id,
    amount: row.amount || 0,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    completedModules: row.completed_modules || [],
    currentModule: row.current_module,
    overallPercent: row.overall_percent || 0,
    totalWatchTime: row.total_watch_time || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    progress: {
      completedModules: row.completed_modules || [],
      currentModule: row.current_module,
      overallPercent: row.overall_percent || 0,
      totalWatchTime: row.total_watch_time || 0,
    },
  };
}

export const enrollmentsApi = {
  /**
   * Get all enrollments for the current user
   */
  async getUserEnrollments(): Promise<EnrollmentWithCourse[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return [];}

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .order('enrolled_at', { ascending: false });

    if (error) {throw new Error(error.message);}

    return (data || []).map(row => ({
      ...mapEnrollment(row),
      course: {
        id: row.courses.id,
        slug: row.courses.slug,
        title: row.courses.title,
        description: row.courses.description,
        price: row.courses.price,
        thumbnail: row.courses.thumbnail || '',
        heroVideoId: row.courses.hero_video_id,
        type: row.courses.type,
        status: row.courses.status,
        rating: row.courses.rating,
        totalStudents: row.courses.total_students,
        features: row.courses.features || [],
        createdAt: new Date(row.courses.created_at),
        updatedAt: new Date(row.courses.updated_at),
        publishedAt: row.courses.published_at ? new Date(row.courses.published_at) : null,
      },
    }));
  },

  /**
   * Check if current user has access to a course
   */
  async checkAccess(courseId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return false;}

    // Check admin first
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'ADMIN') {return true;}

    const { data } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    return !!data;
  },

  /**
   * Get a specific enrollment
   */
  async getEnrollment(courseId: string): Promise<Enrollment | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return null;}

    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error || !data) {return null;}
    return mapEnrollment(data);
  },

  /**
   * Update last accessed time
   */
  async updateLastAccess(enrollmentId: string): Promise<void> {
    await supabase
      .from('enrollments')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', enrollmentId);
  },

  /**
   * Update enrollment progress fields
   */
  async updateProgress(enrollmentId: string, data: {
    completedModules?: string[];
    currentModule?: string | null;
    overallPercent?: number;
    totalWatchTime?: number;
  }): Promise<void> {
    const update: EnrollmentUpdate = {};
    if (data.completedModules !== undefined) {update.completed_modules = data.completedModules;}
    if (data.currentModule !== undefined) {update.current_module = data.currentModule;}
    if (data.overallPercent !== undefined) {update.overall_percent = data.overallPercent;}
    if (data.totalWatchTime !== undefined) {update.total_watch_time = data.totalWatchTime;}

    await supabase
      .from('enrollments')
      .update(update)
      .eq('id', enrollmentId);
  },
};
