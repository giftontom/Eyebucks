/**
 * Admin API - Supabase queries + Edge Functions for admin operations
 * Replaces: apiClient admin methods
 */
import { extractEdgeFnError, isEdgeFnAuthError } from '../../utils/edgeFunctionError';
import { supabase } from '../supabase';

import { paymentsApi } from './payments.api';

import type { Payment } from './payments.api';
import type {
  AdminStats, SalesDataPoint, Module, CourseAnalytics,
  SiteContentItem, AdminCourse, AdminUser, AdminCertificate, RecentActivity,
} from '../../types';
import type {
  CourseRow, ModuleRow, UserRow, CourseUpdate, UserUpdate, SiteContentUpdate,
  SiteContentRow, ModuleUpdate, EnrollmentRow, CertificateRow, Json,
} from '../../types/supabase';

// Query result types for joined queries
type UserWithEnrollments = UserRow & { enrollments: { id: string }[] };
type CourseWithJoins = CourseRow & { modules: { id: string }[]; enrollments: { id: string }[] };
type CertificateWithJoins = {
  id: string; certificate_number: string; student_name: string; course_title: string;
  issue_date: string; status: string; revoked_at: string | null; revoked_reason: string | null;
  created_at: string;
  users: { id: string; name: string; email: string } | null;
  courses: { id: string; title: string } | null;
};
type PaymentWithJoins = {
  id: string; user_id: string; course_id: string; enrollment_id: string | null;
  razorpay_order_id: string | null; razorpay_payment_id: string | null;
  amount: number; currency: string; status: string; method: string | null;
  receipt_number: string | null; refund_id: string | null; refund_amount: number | null;
  refund_reason: string | null; refunded_at: string | null; metadata: Json;
  created_at: string; updated_at: string;
  users: { name: string; email: string } | null;
  courses: { title: string } | null;
};
type ReviewWithJoins = {
  id: string; user_id: string; course_id: string; rating: number;
  comment: string | null; helpful: number; created_at: string;
  users: { name: string; email: string; avatar: string | null } | null;
  courses: { title: string } | null;
};
type SalesRow = { date: string; amount: number; count: number };

export const adminApi = {
  // ============================================
  // DASHBOARD ANALYTICS
  // ============================================

  async getStats(): Promise<{ success: boolean; stats: AdminStats }> {
    const { data, error } = await supabase.rpc('get_admin_stats');
    if (error) {throw new Error(error.message);}
    return { success: true, stats: data as unknown as AdminStats };
  },

  async getSales(days: number = 30): Promise<{ success: boolean; sales: SalesDataPoint[] }> {
    const { data, error } = await supabase.rpc('get_sales_data', { p_days: days });
    if (error) {throw new Error(error.message);}
    return {
      success: true,
      sales: (data || []).map((d: SalesRow) => ({ date: d.date, amount: Number(d.amount) })),
    };
  },

  async getRecentActivity(limit: number = 10): Promise<{ success: boolean; activity: RecentActivity }> {
    const { data, error } = await supabase.rpc('get_recent_activity', { p_limit: limit });
    if (error) {throw new Error(error.message);}
    return { success: true, activity: data as unknown as RecentActivity };
  },

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async getUsers(params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{
    success: boolean;
    users: AdminUser[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
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

    if (error) {throw new Error(error.message);}

    const users: AdminUser[] = (data || []).map((u: UserWithEnrollments) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      isActive: u.is_active,
      phoneVerified: u.phone_verified,
      phoneE164: u.phone_e164,
      createdAt: new Date(u.created_at),
      lastLoginAt: u.last_login_at ? new Date(u.last_login_at) : null,
      enrollmentCount: u.enrollments?.length || 0,
      _count: { enrollments: u.enrollments?.length || 0, certificates: 0 },
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

  async getUserDetails(userId: string): Promise<{ success: boolean; user: UserRow & { enrollments: Array<EnrollmentRow & { courses: CourseRow }> } }> {
    const { data, error } = await supabase
      .from('users')
      .select('*, enrollments(*, courses(*))')
      .eq('id', userId)
      .single();

    if (error) {throw new Error(error.message);}
    return { success: true, user: data };
  },

  async updateUser(userId: string, updates: { isActive?: boolean; role?: string }): Promise<{
    success: boolean;
    message: string;
    user: UserRow;
  }> {
    const update: UserUpdate = {};
    if (updates.isActive !== undefined) {update.is_active = updates.isActive;}
    if (updates.role) {update.role = updates.role as 'USER' | 'ADMIN';}

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId)
      .select()
      .single();

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'User updated', user: data };
  },

  async manualEnrollUser(userId: string, courseId: string): Promise<{
    success: boolean;
    message: string;
    enrollment: EnrollmentRow;
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
      if (error.code === '23505') {throw new Error('User is already enrolled');}
      throw new Error(error.message);
    }
    return { success: true, message: 'User enrolled', enrollment: data };
  },

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  async getCourses(): Promise<{ success: boolean; courses: AdminCourse[] }> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(id), enrollments(id)')
      .order('created_at', { ascending: false });

    if (error) {throw new Error(error.message);}

    const courses: AdminCourse[] = (data || []).map((c: CourseWithJoins) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      price: c.price,
      thumbnail: c.thumbnail,
      heroVideoId: c.hero_video_id,
      type: c.type,
      status: c.status,
      rating: c.rating,
      totalStudents: c.total_students,
      features: c.features,
      createdAt: new Date(c.created_at),
      updatedAt: new Date(c.updated_at),
      publishedAt: c.published_at ? new Date(c.published_at) : null,
      deletedAt: c.deleted_at,
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
  }): Promise<{ success: boolean; message: string; course: CourseRow }> {
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

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Course created', course: data };
  },

  async updateCourse(courseId: string, courseData: {
    title?: string; slug?: string; description?: string; price?: number;
    thumbnail?: string; type?: string; features?: string[];
    heroVideoId?: string; status?: string;
  }): Promise<{
    success: boolean;
    message: string;
    course: CourseRow;
  }> {
    const update: CourseUpdate = {};
    if (courseData.title !== undefined) {update.title = courseData.title;}
    if (courseData.slug !== undefined) {update.slug = courseData.slug;}
    if (courseData.description !== undefined) {update.description = courseData.description;}
    if (courseData.price !== undefined) {update.price = courseData.price;}
    if (courseData.thumbnail !== undefined) {update.thumbnail = courseData.thumbnail;}
    if (courseData.type !== undefined) {update.type = courseData.type as 'BUNDLE' | 'MODULE';}
    if (courseData.features !== undefined) {update.features = courseData.features;}
    if (courseData.heroVideoId !== undefined) {update.hero_video_id = courseData.heroVideoId;}
    if (courseData.status !== undefined) {update.status = courseData.status as 'PUBLISHED' | 'DRAFT';}

    const { data, error } = await supabase
      .from('courses')
      .update(update)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Course updated', course: data };
  },

  async deleteCourse(courseId: string): Promise<{ success: boolean; message: string }> {
    // Soft-delete: set deleted_at instead of actually deleting
    const { error } = await supabase
      .from('courses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', courseId);

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Course archived' };
  },

  async restoreCourse(courseId: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('courses')
      .update({ deleted_at: null })
      .eq('id', courseId);

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Course restored' };
  },

  async publishCourse(courseId: string, status: 'PUBLISHED' | 'DRAFT'): Promise<{
    success: boolean;
    message: string;
    course: CourseRow;
  }> {
    const update: CourseUpdate = { status };
    if (status === 'PUBLISHED') {update.published_at = new Date().toISOString();}

    const { data, error } = await supabase
      .from('courses')
      .update(update)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {throw new Error(error.message);}
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

    if (error) {throw new Error(error.message);}

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
    videoId?: string;
    isFreePreview?: boolean;
  }): Promise<{ success: boolean; message: string; module: ModuleRow }> {
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

    const insertData = {
      course_id: courseId,
      title: moduleData.title,
      duration: moduleData.duration,
      duration_seconds: durationSeconds,
      video_url: moduleData.videoUrl,
      is_free_preview: moduleData.isFreePreview || false,
      order_index: nextOrder,
      ...(moduleData.videoId ? { video_id: moduleData.videoId } : {}),
    } as any;

    const { data, error } = await supabase
      .from('modules')
      .insert(insertData)
      .select()
      .single();

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Module created', module: data };
  },

  async updateModule(courseId: string, moduleId: string, moduleData: {
    title?: string;
    duration?: string;
    videoUrl?: string;
    videoId?: string;
    isFreePreview?: boolean;
    orderIndex?: number;
  }): Promise<{ success: boolean; message: string; module: ModuleRow }> {
    const updateFields: ModuleUpdate & { video_id?: string } = {};
    if (moduleData.title !== undefined) {updateFields.title = moduleData.title;}
    if (moduleData.duration !== undefined) {
      updateFields.duration = moduleData.duration;
      const parts = moduleData.duration.split(':');
      updateFields.duration_seconds = parts.length === 2
        ? parseInt(parts[0]) * 60 + parseInt(parts[1])
        : parseInt(parts[0]) || 0;
    }
    if (moduleData.videoUrl !== undefined) {updateFields.video_url = moduleData.videoUrl;}
    if (moduleData.videoId !== undefined) {updateFields.video_id = moduleData.videoId;}
    if (moduleData.isFreePreview !== undefined) {updateFields.is_free_preview = moduleData.isFreePreview;}
    if (moduleData.orderIndex !== undefined) {updateFields.order_index = moduleData.orderIndex;}

    const { data, error } = await supabase
      .from('modules')
      .update(updateFields as ModuleUpdate)
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Module updated', module: data };
  },

  async deleteModule(courseId: string, moduleId: string): Promise<{ success: boolean; message: string }> {
    // Query video_id before deleting the module (video_id added in migration 014)
    const { data: moduleData } = await supabase
      .from('modules')
      .select('video_id' as any)
      .eq('id', moduleId)
      .eq('course_id', courseId)
      .maybeSingle();

    const videoGuid = (moduleData as any)?.video_id as string | undefined;

    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId)
      .eq('course_id', courseId);

    if (error) {throw new Error(error.message);}

    // Fire-and-forget: delete the Bunny video if it had one
    if (videoGuid) {
      supabase.functions.invoke('video-cleanup', {
        body: { deleteVideoId: videoGuid },
      }).catch(err => {
        console.error('[Admin] Failed to cleanup Bunny video:', err);
      });
    }

    return { success: true, message: 'Module deleted' };
  },

  async reorderModules(courseId: string, moduleIds: string[]): Promise<{
    success: boolean;
    message: string;
  }> {
    // Use atomic RPC, fallback to sequential updates if RPC not available
    const { error: rpcError } = await (supabase.rpc as any)('reorder_modules', {
      p_course_id: courseId,
      p_module_ids: moduleIds,
    });

    if (rpcError) {
      // Fallback: sequential updates
      const updates = moduleIds.map((id, index) =>
        supabase
          .from('modules')
          .update({ order_index: index + 1 })
          .eq('id', id)
          .eq('course_id', courseId)
      );
      await Promise.all(updates);
    }

    return { success: true, message: 'Modules reordered' };
  },

  // ============================================
  // BUNDLE COURSE MANAGEMENT
  // ============================================

  async getBundleCourses(bundleId: string): Promise<{ success: boolean; courseIds: string[] }> {
    const { data, error } = await supabase
      .from('bundle_courses')
      .select('course_id')
      .eq('bundle_id', bundleId)
      .order('order_index', { ascending: true });

    if (error) {throw new Error(error.message);}
    return { success: true, courseIds: (data || []).map(r => r.course_id) };
  },

  async setBundleCourses(bundleId: string, courseIds: string[]): Promise<{ success: boolean; message: string }> {
    // Use atomic RPC, fallback to delete+insert if RPC not available
    const { error: rpcError } = await (supabase.rpc as any)('set_bundle_courses', {
      p_bundle_id: bundleId,
      p_course_ids: courseIds,
    });

    if (rpcError) {
      // Fallback: delete + insert
      const { error: deleteError } = await supabase
        .from('bundle_courses')
        .delete()
        .eq('bundle_id', bundleId);

      if (deleteError) {throw new Error(deleteError.message);}

      if (courseIds.length > 0) {
        const rows = courseIds.map((courseId, index) => ({
          bundle_id: bundleId,
          course_id: courseId,
          order_index: index,
        }));

        const { error: insertError } = await supabase
          .from('bundle_courses')
          .insert(rows);

        if (insertError) {throw new Error(insertError.message);}
      }
    }

    return { success: true, message: 'Bundle courses updated' };
  },

  // ============================================
  // CERTIFICATE MANAGEMENT
  // ============================================

  async getCertificates(params?: { page?: number; limit?: number }): Promise<{
    success: boolean;
    certificates: AdminCertificate[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('certificates')
      .select('*, users(id, name, email), courses(id, title)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw new Error(error.message);}

    return {
      success: true,
      certificates: (data || []).map((c: CertificateWithJoins) => ({
        id: c.id,
        certificateNumber: c.certificate_number,
        studentName: c.student_name,
        courseTitle: c.course_title,
        issueDate: new Date(c.issue_date),
        status: c.status as 'ACTIVE' | 'REVOKED',
        revokedAt: c.revoked_at ? new Date(c.revoked_at) : null,
        revokedReason: c.revoked_reason,
        user: c.users || { id: '', name: '', email: '' },
        course: c.courses || { id: '', title: '' },
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
    certificate: Record<string, unknown>;
  }> {
    let { data, error } = await supabase.functions.invoke('certificate-generate', {
      body: { userId, courseId },
    });

    if (error) {
      // If JWT expired, refresh session and retry once
      if (isEdgeFnAuthError(error)) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error('Your session has expired. Please log in again.');
        }
        const retry = await supabase.functions.invoke('certificate-generate', {
          body: { userId, courseId },
        });
        data = retry.data;
        if (retry.error) {
          throw new Error(await extractEdgeFnError(retry.error, 'Failed to issue certificate'));
        }
      } else {
        throw new Error(await extractEdgeFnError(error, 'Failed to issue certificate'));
      }
    }

    if (!data?.success) {throw new Error(data?.error || 'Failed to issue certificate');}
    return { success: true, message: 'Certificate issued', certificate: data.certificate };
  },

  async revokeCertificate(certificateId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    certificate: CertificateRow;
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

    if (error) {throw new Error(error.message);}
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

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Enrollment revoked' };
  },

  // ============================================
  // SITE CONTENT MANAGEMENT (CMS)
  // ============================================

  async getSiteContent(): Promise<{ success: boolean; items: SiteContentItem[] }> {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .order('section')
      .order('order_index', { ascending: true });

    if (error) {throw new Error(error.message);}
    return {
      success: true,
      items: (data || []).map((r: SiteContentRow) => ({
        id: r.id,
        section: r.section as SiteContentItem['section'],
        title: r.title,
        body: r.body,
        metadata: (r.metadata || {}) as Record<string, unknown>,
        orderIndex: r.order_index,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    };
  },

  async createSiteContent(item: {
    section: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    orderIndex?: number;
    isActive?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('site_content')
      .insert({
        section: item.section,
        title: item.title,
        body: item.body,
        metadata: (item.metadata || {}) as Json,
        order_index: item.orderIndex ?? 0,
        is_active: item.isActive ?? true,
      });

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Content created' };
  },

  async updateSiteContent(id: string, updates: {
    title?: string;
    body?: string;
    metadata?: Record<string, unknown>;
    orderIndex?: number;
    isActive?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    const update: SiteContentUpdate = {};
    if (updates.title !== undefined) {update.title = updates.title;}
    if (updates.body !== undefined) {update.body = updates.body;}
    if (updates.metadata !== undefined) {update.metadata = updates.metadata as Json;}
    if (updates.orderIndex !== undefined) {update.order_index = updates.orderIndex;}
    if (updates.isActive !== undefined) {update.is_active = updates.isActive;}

    const { error } = await supabase
      .from('site_content')
      .update(update)
      .eq('id', id);

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Content updated' };
  },

  async deleteSiteContent(id: string): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
      .from('site_content')
      .delete()
      .eq('id', id);

    if (error) {throw new Error(error.message);}
    return { success: true, message: 'Content deleted' };
  },

  // ============================================
  // PAYMENT MANAGEMENT (Admin)
  // ============================================

  async getPayments(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ success: boolean; payments: Payment[]; total: number }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('payments')
      .select('*, users(name, email), courses(title)', { count: 'exact' });

    if (params?.search) {
      query = query.or(
        `receipt_number.ilike.%${params.search}%,razorpay_payment_id.ilike.%${params.search}%`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw new Error(error.message);}
    return {
      success: true,
      payments: ((data || []) as unknown as PaymentWithJoins[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        courseId: r.course_id,
        enrollmentId: r.enrollment_id,
        razorpayOrderId: r.razorpay_order_id,
        razorpayPaymentId: r.razorpay_payment_id,
        amount: r.amount,
        currency: r.currency,
        status: r.status as Payment['status'],
        method: r.method,
        receiptNumber: r.receipt_number,
        refundId: r.refund_id,
        refundAmount: r.refund_amount,
        refundReason: r.refund_reason,
        refundedAt: r.refunded_at,
        metadata: (r.metadata || {}) as Record<string, unknown>,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        userName: r.users?.name,
        userEmail: r.users?.email,
        courseTitle: r.courses?.title,
      })),
      total: count || 0,
    };
  },

  async processRefund(paymentId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const result = await paymentsApi.processRefund(paymentId, reason);
    return { success: true, message: result.message };
  },

  // ============================================
  // COURSE ANALYTICS
  // ============================================

  async getCourseAnalytics(courseId: string): Promise<{ success: boolean; analytics: CourseAnalytics }> {
    const { data, error } = await supabase.rpc('get_course_analytics', { p_course_id: courseId });
    if (error) {throw new Error(error.message);}
    return { success: true, analytics: data as unknown as CourseAnalytics };
  },

  // ============================================
  // REVIEWS MODERATION
  // ============================================

  async getReviews(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ reviews: AdminReview[]; total: number }> {
    const page = params?.page || 1;
    const limit = Math.min(params?.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('reviews')
      .select('*, users:user_id(name, email, avatar), courses:course_id(title)', { count: 'exact' });

    if (params?.search) {
      query = query.or(`comment.ilike.%${params.search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {throw new Error(error.message);}

    return {
      reviews: ((data || []) as ReviewWithJoins[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        courseId: r.course_id,
        rating: r.rating,
        comment: r.comment || '',
        helpful: r.helpful || 0,
        createdAt: r.created_at,
        userName: r.users?.name || 'Unknown',
        userEmail: r.users?.email || '',
        courseTitle: r.courses?.title || 'Unknown',
      })),
      total: count || 0,
    };
  },

  async deleteReview(reviewId: string): Promise<void> {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {throw new Error(error.message);}
  },

  // ============================================
  // VIDEO CLEANUP (Orphaned Bunny Videos)
  // ============================================

  async cleanupOrphanedVideos(dryRun: boolean = true): Promise<{
    success: boolean;
    dryRun: boolean;
    totalBunnyVideos: number;
    referencedInDb: number;
    orphanedCount: number;
    orphanedVideos: Array<{ guid: string; title: string; dateUploaded: string }>;
    deletedCount?: number;
    failedCount?: number;
  }> {
    const { data, error } = await supabase.functions.invoke('video-cleanup', {
      body: { dryRun },
    });

    if (error) {
      throw new Error(await extractEdgeFnError(error, 'Failed to run video cleanup'));
    }

    if (!data?.success) {throw new Error(data?.error || 'Video cleanup failed');}
    return data;
  },
};

export interface AdminReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  comment: string;
  helpful: number;
  createdAt: string;
  userName: string;
  userEmail: string;
  courseTitle: string;
}
