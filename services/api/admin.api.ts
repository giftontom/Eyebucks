/**
 * Admin API - Supabase queries + Edge Functions for admin operations
 * Replaces: apiClient admin methods
 */
import { supabase } from '../supabase';
import type { AdminStats, SalesDataPoint, Course, Module } from '../../types';

export const adminApi = {
  // ============================================
  // DASHBOARD ANALYTICS
  // ============================================

  async getStats(): Promise<{ success: boolean; stats: AdminStats }> {
    const { data, error } = await supabase.rpc('get_admin_stats');
    if (error) throw new Error(error.message);
    return { success: true, stats: data as unknown as AdminStats };
  },

  async getSales(days: number = 30): Promise<{ success: boolean; sales: SalesDataPoint[] }> {
    const { data, error } = await supabase.rpc('get_sales_data', { p_days: days });
    if (error) throw new Error(error.message);
    return {
      success: true,
      sales: (data || []).map((d: any) => ({ date: d.date, amount: Number(d.amount) })),
    };
  },

  async getRecentActivity(limit: number = 10): Promise<{ success: boolean; activity: any }> {
    const { data, error } = await supabase.rpc('get_recent_activity', { p_limit: limit });
    if (error) throw new Error(error.message);
    return { success: true, activity: data };
  },

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{
    success: boolean;
    users: any[];
    pagination: any;
  }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*, enrollments(id)', { count: 'exact' });

    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
    }
    if (params?.role) {
      query = query.eq('role', params.role as 'USER' | 'ADMIN');
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    const users = (data || []).map(u => ({
      ...u,
      enrollmentCount: u.enrollments?.length || 0,
      _count: { enrollments: u.enrollments?.length || 0 },
    }));

    return {
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  },

  async getUserDetails(userId: string): Promise<{ success: boolean; user: any }> {
    const { data, error } = await supabase
      .from('users')
      .select('*, enrollments(*, courses(*))')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return { success: true, user: data };
  },

  async updateUser(userId: string, updates: { isActive?: boolean; role?: string }): Promise<{
    success: boolean;
    message: string;
    user: any;
  }> {
    const update: any = {};
    if (updates.isActive !== undefined) update.is_active = updates.isActive;
    if (updates.role) update.role = updates.role;

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, message: 'User updated', user: data };
  },

  async manualEnrollUser(userId: string, courseId: string): Promise<{
    success: boolean;
    message: string;
    enrollment: any;
  }> {
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        status: 'ACTIVE',
        amount: 0,
        payment_id: 'manual_enrollment',
        order_id: 'manual_enrollment',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('User is already enrolled');
      throw new Error(error.message);
    }
    return { success: true, message: 'User enrolled', enrollment: data };
  },

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  async getCourses(): Promise<{ success: boolean; courses: any[] }> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(id), enrollments(id)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const courses = (data || []).map(c => ({
      ...c,
      heroVideoId: c.hero_video_id,
      totalStudents: c.total_students,
      enrollmentCount: c.enrollments?.length || 0,
      _count: {
        modules: c.modules?.length || 0,
        enrollments: c.enrollments?.length || 0,
      },
    }));

    return { success: true, courses };
  },

  async createCourse(courseData: {
    title: string;
    slug: string;
    description: string;
    price: number;
    thumbnail?: string;
    type: string;
    features?: string[];
    heroVideoId?: string;
  }): Promise<{ success: boolean; message: string; course: any }> {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: courseData.title,
        slug: courseData.slug,
        description: courseData.description,
        price: courseData.price,
        thumbnail: courseData.thumbnail || '',
        type: courseData.type as 'BUNDLE' | 'MODULE',
        features: courseData.features || [],
        hero_video_id: courseData.heroVideoId,
        status: 'DRAFT',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, message: 'Course created', course: data };
  },

  async updateCourse(courseId: string, courseData: any): Promise<{
    success: boolean;
    message: string;
    course: any;
  }> {
    const update: any = {};
    if (courseData.title !== undefined) update.title = courseData.title;
    if (courseData.slug !== undefined) update.slug = courseData.slug;
    if (courseData.description !== undefined) update.description = courseData.description;
    if (courseData.price !== undefined) update.price = courseData.price;
    if (courseData.thumbnail !== undefined) update.thumbnail = courseData.thumbnail;
    if (courseData.type !== undefined) update.type = courseData.type;
    if (courseData.features !== undefined) update.features = courseData.features;
    if (courseData.heroVideoId !== undefined) update.hero_video_id = courseData.heroVideoId;
    if (courseData.status !== undefined) update.status = courseData.status;

    const { data, error } = await supabase
      .from('courses')
      .update(update)
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, message: 'Course updated', course: data };
  },

  async deleteCourse(courseId: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) throw new Error(error.message);
    return { success: true, message: 'Course deleted' };
  },

  async publishCourse(courseId: string, status: 'PUBLISHED' | 'DRAFT'): Promise<{
    success: boolean;
    message: string;
    course: any;
  }> {
    const update: any = { status };
    if (status === 'PUBLISHED') update.published_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('courses')
      .update(update)
      .eq('id', courseId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, message: `Course ${status.toLowerCase()}`, course: data };
  },

  // ============================================
  // MODULE MANAGEMENT
  // ============================================

  async getModules(courseId: string): Promise<{ success: boolean; modules: Module[] }> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(error.message);

    return {
      success: true,
      modules: (data || []).map(m => ({
        id: m.id,
        courseId: m.course_id,
        title: m.title,
        duration: m.duration || '0:00',
        durationSeconds: m.duration_seconds || 0,
        videoUrl: m.video_url || '',
        isFreePreview: m.is_free_preview || false,
        orderIndex: m.order_index,
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.updated_at),
      })),
    };
  },

  async createModule(courseId: string, moduleData: {
    title: string;
    duration: string;
    videoUrl: string;
    isFreePreview?: boolean;
  }): Promise<{ success: boolean; message: string; module: any }> {
    // Get current max order_index
    const { data: existing } = await supabase
      .from('modules')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.order_index || 0) + 1;

    // Parse duration MM:SS to seconds
    const durationParts = moduleData.duration.split(':');
    const durationSeconds = durationParts.length === 2
      ? parseInt(durationParts[0]) * 60 + parseInt(durationParts[1])
      : parseInt(durationParts[0]) || 0;

    const { data, error } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title: moduleData.title,
        duration: moduleData.duration,
        duration_seconds: durationSeconds,
        video_url: moduleData.videoUrl,
        is_free_preview: moduleData.isFreePreview || false,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, message: 'Module created', module: data };
  },

  async updateModule(courseId: string, moduleId: string, moduleData: {
    title?: string;
    duration?: string;
    videoUrl?: string;
    isFreePreview?: boolean;
    orderIndex?: number;
  }): Promise<{ success: boolean; message: string; module: any }> {
    const update: any = {};
    if (moduleData.title !== undefined) update.title = moduleData.title;
    if (moduleData.duration !== undefined) {
      update.duration = moduleData.duration;
      const parts = moduleData.duration.split(':');
      update.duration_seconds = parts.length === 2
        ? parseInt(parts[0]) * 60 + parseInt(parts[1])
        : parseInt(parts[0]) || 0;
    }
    if (moduleData.videoUrl !== undefined) update.video_url = moduleData.videoUrl;
    if (moduleData.isFreePreview !== undefined) update.is_free_preview = moduleData.isFreePreview;
    if (moduleData.orderIndex !== undefined) update.order_index = moduleData.orderIndex;

    const { data, error } = await supabase
      .from('modules')
      .update(update)
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, message: 'Module updated', module: data };
  },

  async deleteModule(courseId: string, moduleId: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)
      .eq('course_id', courseId);

    if (error) throw new Error(error.message);
    return { success: true, message: 'Module deleted' };
  },

  async reorderModules(courseId: string, moduleIds: string[]): Promise<{
    success: boolean;
    message: string;
  }> {
    // Update each module's order_index
    const updates = moduleIds.map((id, index) =>
      supabase
        .from('modules')
        .update({ order_index: index + 1 })
        .eq('id', id)
        .eq('course_id', courseId)
    );

    await Promise.all(updates);
    return { success: true, message: 'Modules reordered' };
  },

  // ============================================
  // CERTIFICATE MANAGEMENT
  // ============================================

  async getCertificates(params?: { page?: number; limit?: number }): Promise<{
    success: boolean;
    certificates: any[];
    pagination: any;
  }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('certificates')
      .select('*, users(id, name, email), courses(id, title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return {
      success: true,
      certificates: (data || []).map(c => ({
        id: c.id,
        certificateNumber: c.certificate_number,
        studentName: c.student_name,
        courseTitle: c.course_title,
        issueDate: c.issue_date,
        status: c.status,
        revokedAt: c.revoked_at,
        revokedReason: c.revoked_reason,
        user: c.users,
        course: c.courses,
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  },

  async issueCertificate(userId: string, courseId: string): Promise<{
    success: boolean;
    message: string;
    certificate: any;
  }> {
    const { data, error } = await supabase.functions.invoke('certificate-generate', {
      body: { userId, courseId },
    });

    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || 'Failed to issue certificate');
    return { success: true, message: 'Certificate issued', certificate: data.certificate };
  },

  async revokeCertificate(certificateId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    certificate: any;
  }> {
    const { data, error } = await supabase
      .from('certificates')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
        revoked_reason: reason || 'Revoked by admin',
      })
      .eq('id', certificateId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, message: 'Certificate revoked', certificate: data };
  },

  // ============================================
  // ENROLLMENT MANAGEMENT (Admin)
  // ============================================

  async revokeEnrollment(enrollmentId: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'REVOKED' })
      .eq('id', enrollmentId);

    if (error) throw new Error(error.message);
    return { success: true, message: 'Enrollment revoked' };
  },
};
