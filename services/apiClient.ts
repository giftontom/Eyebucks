/**
 * API Client - Supabase Backend Facade
 * Backward-compatible wrapper that delegates to Supabase API services.
 * All pages continue to import `apiClient` and call the same methods.
 */

import { supabase } from './supabase';
import { coursesApi, enrollmentsApi, progressApi, checkoutApi, adminApi, notificationsApi, siteContentApi, paymentsApi, certificatesApi } from './api';
import type { Course, Module, Enrollment, Progress, ProgressStats } from '../types';

/**
 * Backward-compatible API client that delegates to Supabase services.
 * Pages import { apiClient } and call the same methods as before.
 */
class ApiClient {
  // ============================================
  // COURSES API
  // ============================================

  async getCourses() {
    return coursesApi.getCourses();
  }

  async getCourse(id: string) {
    return coursesApi.getCourse(id);
  }

  async getCourseModules(courseId: string) {
    return coursesApi.getCourseModules(courseId);
  }

  // ============================================
  // ENROLLMENTS API
  // ============================================

  async createEnrollment(data: {
    userId: string;
    courseId: string;
    paymentId?: string;
    orderId?: string;
    amount: number;
  }) {
    const enrollment = await enrollmentsApi.getEnrollment(data.courseId);
    if (!enrollment) throw new Error('Enrollment not found - should be created by checkout');
    return { success: true, enrollment };
  }

  async getUserEnrollments(_userId: string) {
    const enrollments = await enrollmentsApi.getUserEnrollments();
    return { success: true, enrollments };
  }

  async checkAccess(_userId: string, courseId: string) {
    const hasAccess = await enrollmentsApi.checkAccess(courseId);
    return { success: true, hasAccess };
  }

  async updateLastAccess(enrollmentId: string) {
    await enrollmentsApi.updateLastAccess(enrollmentId);
    return { success: true };
  }

  async updateEnrollmentProgress(
    enrollmentId: string,
    progress: {
      completedModules?: string[];
      currentModule?: string | null;
      overallPercent?: number;
      totalWatchTime?: number;
    }
  ) {
    await enrollmentsApi.updateProgress(enrollmentId, progress);
    return { success: true };
  }

  // ============================================
  // PROGRESS API
  // ============================================

  async saveProgress(data: {
    userId: string;
    courseId: string;
    moduleId: string;
    timestamp: number;
  }) {
    await progressApi.saveProgress(data.courseId, data.moduleId, data.timestamp);
    return { success: true, progress: {} as Progress };
  }

  async getProgress(_userId: string, courseId: string) {
    const progress = await progressApi.getProgress(courseId);
    return { success: true, progress };
  }

  async getModuleProgress(_userId: string, courseId: string, moduleId: string) {
    const progress = await progressApi.getModuleProgress(courseId, moduleId);
    return { success: true, progress };
  }

  async markModuleComplete(data: {
    userId: string;
    courseId: string;
    moduleId: string;
    currentTime?: number;
    duration?: number;
  }) {
    await progressApi.markComplete(data.courseId, data.moduleId);
    return { success: true, progress: {} as Progress };
  }

  async getProgressStats(_userId: string, courseId: string) {
    const stats = await progressApi.getCourseStats(courseId);
    return { success: true, stats };
  }

  async clearProgress(_userId: string, courseId: string) {
    await progressApi.clearProgress(courseId);
    return { success: true };
  }

  // ============================================
  // AUTH API
  // ============================================

  async googleAuth(_data: {
    credential?: string;
    email: string;
    name: string;
    picture?: string;
    sub: string;
  }) {
    throw new Error('Use AuthContext.loginWithGoogle() for Supabase OAuth flow');
  }

  async getCurrentUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { success: false, user: null };

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    return { success: true, user: profile };
  }

  async updatePhone(userId: string, phone: string) {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phone)) {
      throw new Error('Invalid E.164 format. Phone must start with + and country code.');
    }

    const { error } = await supabase
      .from('users')
      .update({ phone_e164: phone, phone_verified: true })
      .eq('id', userId);

    if (error) throw new Error('Failed to update phone number');
    return { success: true, user: null };
  }

  async validateSession(_userId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    return { success: true, valid: !!session };
  }

  async logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('eyebuckz_user');
    return { success: true, message: 'Logged out successfully' };
  }

  async getUser(userId: string) {
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, avatar, role, created_at')
      .eq('id', userId)
      .single();

    return { success: true, user: profile };
  }

  // ============================================
  // CHECKOUT API
  // ============================================

  async createOrder(data: { courseId: string; userId: string }) {
    return checkoutApi.createOrder(data.courseId);
  }

  async verifyPayment(data: {
    orderId: string;
    paymentId: string;
    signature?: string;
    courseId: string;
    userId: string;
  }) {
    return checkoutApi.verifyPayment({
      orderId: data.orderId,
      paymentId: data.paymentId,
      signature: data.signature,
      courseId: data.courseId,
    });
  }

  async checkOrderStatus(orderId: string) {
    return checkoutApi.checkOrderStatus(orderId);
  }

  // ============================================
  // ADMIN API
  // ============================================

  async getAdminStats() {
    return adminApi.getStats();
  }

  async getAdminSales(days: number = 30) {
    return adminApi.getSales(days);
  }

  async getAdminRecentActivity(limit: number = 10) {
    return adminApi.getRecentActivity(limit);
  }

  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) {
    return adminApi.getUsers(params);
  }

  async getAdminUserDetails(userId: string) {
    return adminApi.getUserDetails(userId);
  }

  async updateAdminUser(userId: string, data: { isActive?: boolean; role?: string }) {
    return adminApi.updateUser(userId, data);
  }

  async manualEnrollUser(userId: string, courseId: string) {
    return adminApi.manualEnrollUser(userId, courseId);
  }

  async getAdminCourses() {
    return adminApi.getCourses();
  }

  async createAdminCourse(data: {
    title: string;
    slug: string;
    description: string;
    price: number;
    thumbnail?: string;
    type: string;
    features?: string[];
  }) {
    return adminApi.createCourse(data);
  }

  async updateAdminCourse(courseId: string, data: any) {
    return adminApi.updateCourse(courseId, data);
  }

  async deleteAdminCourse(courseId: string) {
    return adminApi.deleteCourse(courseId);
  }

  async publishAdminCourse(courseId: string, status: 'PUBLISHED' | 'DRAFT') {
    return adminApi.publishCourse(courseId, status);
  }

  async getBundleCourses(bundleId: string) {
    return adminApi.getBundleCourses(bundleId);
  }

  async setBundleCourses(bundleId: string, courseIds: string[]) {
    return adminApi.setBundleCourses(bundleId, courseIds);
  }

  async getAdminCertificates(params?: { page?: number; limit?: number }) {
    return adminApi.getCertificates(params);
  }

  async issueAdminCertificate(data: { userId: string; courseId: string }) {
    return adminApi.issueCertificate(data.userId, data.courseId);
  }

  async revokeAdminCertificate(certificateId: string, reason?: string) {
    return adminApi.revokeCertificate(certificateId, reason);
  }

  async createModule(courseId: string, data: {
    title: string;
    duration: string;
    videoUrl: string;
    isFreePreview?: boolean;
  }) {
    return adminApi.createModule(courseId, data);
  }

  async updateModule(courseId: string, moduleId: string, data: {
    title?: string;
    duration?: string;
    videoUrl?: string;
    isFreePreview?: boolean;
  }) {
    return adminApi.updateModule(courseId, moduleId, data);
  }

  async deleteModule(courseId: string, moduleId: string) {
    return adminApi.deleteModule(courseId, moduleId);
  }

  async reorderModules(courseId: string, moduleIds: string[]) {
    return adminApi.reorderModules(courseId, moduleIds);
  }

  // ============================================
  // REVIEWS API (Direct Supabase queries)
  // ============================================

  async get(endpoint: string) {
    const reviewMatch = endpoint.match(/^\/reviews\/course\/([^?]+)/);
    if (reviewMatch) {
      const courseId = reviewMatch[1];
      const params = new URLSearchParams(endpoint.split('?')[1] || '');
      const page = parseInt(params.get('page') || '1');
      const limit = parseInt(params.get('limit') || '10');
      const offset = (page - 1) * limit;

      const { data: reviews, error, count } = await supabase
        .from('reviews')
        .select(`
          id, user_id, rating, comment, helpful_count, created_at, updated_at,
          users:user_id (name, avatar)
        `, { count: 'exact' })
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw new Error(error.message);

      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('course_id', courseId);

      const total = allReviews?.length || 0;
      const avgRating = total > 0
        ? allReviews!.reduce((sum, r) => sum + r.rating, 0) / total
        : 0;
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      allReviews?.forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) {
          distribution[r.rating as keyof typeof distribution]++;
        }
      });

      return {
        success: true,
        reviews: (reviews || []).map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          rating: r.rating,
          comment: r.comment,
          helpful: r.helpful_count,
          user: { name: r.users?.name || 'Anonymous', avatar: r.users?.avatar || '' },
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })),
        summary: { total, averageRating: avgRating, distribution },
        pagination: { hasMore: (count || 0) > offset + limit },
      };
    }

    throw new Error(`Unsupported GET endpoint: ${endpoint}`);
  }

  async post(endpoint: string, body: any) {
    if (endpoint === '/reviews') {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          course_id: body.courseId,
          rating: body.rating,
          comment: body.comment,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, review: data };
    }

    throw new Error(`Unsupported POST endpoint: ${endpoint}`);
  }

  async patch(endpoint: string, body: any) {
    const reviewPatchMatch = endpoint.match(/^\/reviews\/(.+)$/);
    if (reviewPatchMatch) {
      const reviewId = reviewPatchMatch[1];
      const { data, error } = await supabase
        .from('reviews')
        .update({ rating: body.rating, comment: body.comment })
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, review: data };
    }

    throw new Error(`Unsupported PATCH endpoint: ${endpoint}`);
  }

  async delete(endpoint: string) {
    const reviewDeleteMatch = endpoint.match(/^\/reviews\/(.+)$/);
    if (reviewDeleteMatch) {
      const reviewId = reviewDeleteMatch[1];
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw new Error(error.message);
      return { success: true };
    }

    throw new Error(`Unsupported DELETE endpoint: ${endpoint}`);
  }

  // ============================================
  // SITE CONTENT API
  // ============================================

  async getSiteContentBySection(section: string) {
    return siteContentApi.getBySection(section);
  }

  // ============================================
  // PAYMENTS API
  // ============================================

  async getUserPayments() {
    return paymentsApi.getUserPayments();
  }

  async getPaymentByOrder(orderId: string) {
    return paymentsApi.getPaymentByOrder(orderId);
  }

  async getAdminPayments(params?: { page?: number; limit?: number; search?: string }) {
    return adminApi.getPayments(params);
  }

  async processRefund(paymentId: string, reason: string) {
    return adminApi.processRefund(paymentId, reason);
  }

  // ============================================
  // CERTIFICATES API (User-facing)
  // ============================================

  async getUserCertificates() {
    return certificatesApi.getUserCertificates();
  }

  // ============================================
  // ADMIN - SOFT DELETE / RESTORE
  // ============================================

  async restoreAdminCourse(courseId: string) {
    return adminApi.restoreCourse(courseId);
  }

  // ============================================
  // ADMIN - CMS
  // ============================================

  async getAdminSiteContent() {
    return adminApi.getSiteContent();
  }

  async createAdminSiteContent(item: {
    section: string;
    title: string;
    body: string;
    metadata?: Record<string, any>;
    orderIndex?: number;
    isActive?: boolean;
  }) {
    return adminApi.createSiteContent(item);
  }

  async updateAdminSiteContent(id: string, updates: any) {
    return adminApi.updateSiteContent(id, updates);
  }

  async deleteAdminSiteContent(id: string) {
    return adminApi.deleteSiteContent(id);
  }

  // ============================================
  // ADMIN - ANALYTICS
  // ============================================

  async getCourseAnalytics(courseId: string) {
    return adminApi.getCourseAnalytics(courseId);
  }

  // ============================================
  // USER PROFILE UPDATE
  // ============================================

  async updateProfile(userId: string, data: { name?: string }) {
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;

    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId);

    if (error) throw new Error('Failed to update profile');
    return { success: true };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async healthCheck() {
    try {
      const { error } = await supabase.from('courses').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  getBaseURL() {
    return import.meta.env.VITE_SUPABASE_URL || '';
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Common API response type
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; statusCode: number };
}

export type { ApiResponse };
