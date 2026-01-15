/**
 * API Client for Eyebuckz LMS Backend
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  [key: string]: any;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('eyebuckz_access_token');
  }

  /**
   * Set access token in localStorage
   */
  private setAccessToken(token: string) {
    localStorage.setItem('eyebuckz_access_token', token);
  }

  /**
   * Remove access token from localStorage
   */
  private removeAccessToken() {
    localStorage.removeItem('eyebuckz_access_token');
  }

  /**
   * Get authentication headers with JWT token
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken();

    return {
      'Content-Type': 'application/json',
      ...(token && {
        'Authorization': `Bearer ${token}`
      })
    };
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Send cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.accessToken) {
        this.setAccessToken(data.accessToken);
        return data.accessToken;
      }

      return null;
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Generic fetch wrapper with error handling and auto token refresh
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Always send cookies
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryCount === 0) {
        console.log('[API] Access token expired, attempting refresh...');

        const newToken = await this.refreshAccessToken();

        if (newToken) {
          // Retry request with new token
          return this.request<T>(endpoint, options, retryCount + 1);
        } else {
          // Refresh failed - user needs to login again
          console.log('[API] Token refresh failed, clearing auth state');
          this.removeAccessToken();
          localStorage.removeItem('eyebuckz_user');

          // Redirect to login if not already there
          if (!window.location.hash.includes('/login')) {
            window.location.hash = '/login';
          }

          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error);
      throw error;
    }
  }

  // ============================================
  // COURSES API
  // ============================================

  async getCourses() {
    return this.request<{ success: boolean; courses: any[] }>('/api/courses');
  }

  async getCourse(id: string) {
    return this.request<{ success: boolean; course: any }>(`/api/courses/${id}`);
  }

  async getCourseModules(id: string) {
    return this.request<{ success: boolean; modules: any[]; hasAccess: boolean }>(
      `/api/courses/${id}/modules`
    );
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
    return this.request<{ success: boolean; enrollment: any }>('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getUserEnrollments(userId: string) {
    return this.request<{ success: boolean; enrollments: any[] }>(
      `/api/enrollments/user/${userId}`
    );
  }

  async checkAccess(userId: string, courseId: string) {
    return this.request<{ success: boolean; hasAccess: boolean; enrollment?: any }>(
      `/api/enrollments/check/${userId}/${courseId}`
    );
  }

  async updateLastAccess(enrollmentId: string) {
    return this.request<{ success: boolean }>(`/api/enrollments/${enrollmentId}/access`, {
      method: 'PATCH'
    });
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
    return this.request<{ success: boolean }>(
      `/api/enrollments/${enrollmentId}/progress`,
      {
        method: 'PATCH',
        body: JSON.stringify(progress)
      }
    );
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
    return this.request<{ success: boolean; progress: any }>('/api/progress', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getProgress(userId: string, courseId: string) {
    return this.request<{ success: boolean; progress: any[] }>(
      `/api/progress/${userId}/${courseId}`
    );
  }

  async getModuleProgress(userId: string, courseId: string, moduleId: string) {
    return this.request<{ success: boolean; progress: any | null }>(
      `/api/progress/${userId}/${courseId}/${moduleId}`
    );
  }

  async markModuleComplete(data: {
    userId: string;
    courseId: string;
    moduleId: string;
    currentTime?: number;
    duration?: number;
  }) {
    return this.request<{ success: boolean; progress: any; stats?: any }>(
      '/api/progress/complete',
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      }
    );
  }

  async getProgressStats(userId: string, courseId: string) {
    return this.request<{ success: boolean; stats: any }>(
      `/api/progress/${userId}/${courseId}/stats`
    );
  }

  async clearProgress(userId: string, courseId: string) {
    return this.request<{ success: boolean }>(
      `/api/progress/${userId}/${courseId}`,
      {
        method: 'DELETE'
      }
    );
  }

  // ============================================
  // AUTH API
  // ============================================

  async googleAuth(data: {
    credential?: string;
    email: string;
    name: string;
    picture?: string;
    sub: string;
  }) {
    const response = await this.request<{
      success: boolean;
      user: any;
      tokens: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      };
      isNewUser: boolean;
    }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    // Store access token
    if (response.tokens?.accessToken) {
      this.setAccessToken(response.tokens.accessToken);
    }

    return response;
  }

  async getCurrentUser() {
    return this.request<{
      success: boolean;
      user: any;
    }>('/api/auth/me');
  }

  async updatePhone(userId: string, phone: string) {
    return this.request<{
      success: boolean;
      user: any;
    }>('/api/auth/phone', {
      method: 'POST',
      body: JSON.stringify({ userId, phone })
    });
  }

  async validateSession(userId: string) {
    return this.request<{
      success: boolean;
      valid: boolean;
    }>(`/api/auth/validate-session/${userId}`);
  }

  async logout() {
    const response = await this.request<{
      success: boolean;
      message: string;
    }>('/api/auth/logout', {
      method: 'POST'
    });

    // Clear local token
    this.removeAccessToken();

    return response;
  }

  async getUser(userId: string) {
    return this.request<{
      success: boolean;
      user: any;
    }>(`/api/auth/user/${userId}`);
  }

  // ============================================
  // CHECKOUT API
  // ============================================

  async createOrder(data: {
    courseId: string;
    userId: string;
  }) {
    return this.request<{
      success: boolean;
      orderId: string;
      amount: number;
      currency: string;
      key: string;
      courseTitle: string;
      mock?: boolean;
    }>('/api/checkout/create-order', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async verifyPayment(data: {
    orderId: string;
    paymentId: string;
    signature?: string;
    courseId: string;
    userId: string;
  }) {
    return this.request<{
      success: boolean;
      verified: boolean;
      enrollmentId: string;
      mock?: boolean;
    }>('/api/checkout/verify', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async checkOrderStatus(orderId: string) {
    return this.request<{
      success: boolean;
      status: 'pending' | 'completed';
      enrollment?: any;
    }>(`/api/checkout/status/${orderId}`);
  }

  // ============================================
  // ADMIN API
  // ============================================

  // Dashboard Analytics
  async getAdminStats() {
    return this.request<{
      success: boolean;
      stats: {
        totalUsers: number;
        activeUsers: number;
        totalRevenue: number;
        totalCourses: number;
        draftCourses: number;
        totalEnrollments: number;
        totalCertificates: number;
      };
    }>('/api/admin/stats');
  }

  async getAdminSales(days: number = 30) {
    return this.request<{
      success: boolean;
      sales: Array<{ date: string; amount: number }>;
    }>(`/api/admin/sales?days=${days}`);
  }

  async getAdminRecentActivity(limit: number = 10) {
    return this.request<{
      success: boolean;
      activity: any;
    }>(`/api/admin/recent-activity?limit=${limit}`);
  }

  // User Management
  async getAdminUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      success: boolean;
      users: any[];
      pagination: any;
    }>(`/api/admin/users${query ? `?${query}` : ''}`);
  }

  async getAdminUserDetails(userId: string) {
    return this.request<{
      success: boolean;
      user: any;
    }>(`/api/admin/users/${userId}`);
  }

  async updateAdminUser(userId: string, data: { isActive?: boolean; role?: string }) {
    return this.request<{
      success: boolean;
      message: string;
      user: any;
    }>(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async manualEnrollUser(userId: string, courseId: string) {
    return this.request<{
      success: boolean;
      message: string;
      enrollment: any;
    }>(`/api/admin/users/${userId}/enroll/${courseId}`, {
      method: 'POST'
    });
  }

  // Course Management
  async getAdminCourses() {
    return this.request<{
      success: boolean;
      courses: any[];
    }>('/api/admin/courses');
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
    return this.request<{
      success: boolean;
      message: string;
      course: any;
    }>('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateAdminCourse(courseId: string, data: any) {
    return this.request<{
      success: boolean;
      message: string;
      course: any;
    }>(`/api/admin/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteAdminCourse(courseId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/api/admin/courses/${courseId}`, {
      method: 'DELETE'
    });
  }

  async publishAdminCourse(courseId: string, status: 'PUBLISHED' | 'DRAFT') {
    return this.request<{
      success: boolean;
      message: string;
      course: any;
    }>(`/api/admin/courses/${courseId}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // Certificate Management
  async getAdminCertificates(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{
      success: boolean;
      certificates: any[];
      pagination: any;
    }>(`/api/admin/certificates${query ? `?${query}` : ''}`);
  }

  async issueAdminCertificate(data: { userId: string; courseId: string }) {
    return this.request<{
      success: boolean;
      message: string;
      certificate: any;
    }>('/api/admin/certificates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async revokeAdminCertificate(certificateId: string, reason?: string) {
    return this.request<{
      success: boolean;
      message: string;
      certificate: any;
    }>(`/api/admin/certificates/${certificateId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason })
    });
  }

  // Module Management
  async createModule(courseId: string, data: {
    title: string;
    duration: string;
    videoUrl: string;
    isFreePreview?: boolean;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      module: any;
    }>(`/api/admin/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateModule(courseId: string, moduleId: string, data: {
    title?: string;
    duration?: string;
    videoUrl?: string;
    isFreePreview?: boolean;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      module: any;
    }>(`/api/admin/courses/${courseId}/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deleteModule(courseId: string, moduleId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/api/admin/courses/${courseId}/modules/${moduleId}`, {
      method: 'DELETE'
    });
  }

  async reorderModules(courseId: string, moduleIds: string[]) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/api/admin/courses/${courseId}/modules/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ moduleIds })
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if API is healthy
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('[API] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get API base URL
   */
  getBaseURL() {
    return this.baseURL;
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export type
export type { ApiResponse };
