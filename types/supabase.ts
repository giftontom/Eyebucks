/**
 * Supabase Database Types
 * Generated from schema - update with: supabase gen types typescript --local > types/supabase.ts
 * This is a manual version matching our schema; regenerate after `supabase db push`
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar: string | null;
          phone_e164: string | null;
          google_id: string | null;
          role: 'USER' | 'ADMIN';
          phone_verified: boolean;
          email_verified: boolean;
          is_active: boolean;
          failed_login_attempts: number;
          locked_until: string | null;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar?: string | null;
          phone_e164?: string | null;
          google_id?: string | null;
          role?: 'USER' | 'ADMIN';
          phone_verified?: boolean;
          email_verified?: boolean;
          is_active?: boolean;
          failed_login_attempts?: number;
          locked_until?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar?: string | null;
          phone_e164?: string | null;
          google_id?: string | null;
          role?: 'USER' | 'ADMIN';
          phone_verified?: boolean;
          email_verified?: boolean;
          is_active?: boolean;
          failed_login_attempts?: number;
          locked_until?: string | null;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          price: number;
          thumbnail: string;
          hero_video_id: string | null;
          type: 'BUNDLE' | 'MODULE';
          status: 'PUBLISHED' | 'DRAFT';
          rating: number | null;
          total_students: number;
          features: string[];
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          price: number;
          thumbnail?: string;
          hero_video_id?: string | null;
          type: 'BUNDLE' | 'MODULE';
          status?: 'PUBLISHED' | 'DRAFT';
          rating?: number | null;
          total_students?: number;
          features?: string[];
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          price?: number;
          thumbnail?: string;
          hero_video_id?: string | null;
          type?: 'BUNDLE' | 'MODULE';
          status?: 'PUBLISHED' | 'DRAFT';
          rating?: number | null;
          total_students?: number;
          features?: string[];
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          duration: string | null;
          duration_seconds: number;
          video_url: string | null;
          is_free_preview: boolean;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          duration?: string | null;
          duration_seconds?: number;
          video_url?: string | null;
          is_free_preview?: boolean;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          duration?: string | null;
          duration_seconds?: number;
          video_url?: string | null;
          is_free_preview?: boolean;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'modules_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';
          payment_id: string | null;
          order_id: string | null;
          amount: number;
          completed_modules: string[];
          current_module: string | null;
          overall_percent: number;
          total_watch_time: number;
          enrolled_at: string;
          last_accessed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';
          payment_id?: string | null;
          order_id?: string | null;
          amount?: number;
          completed_modules?: string[];
          current_module?: string | null;
          overall_percent?: number;
          total_watch_time?: number;
          enrolled_at?: string;
          last_accessed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';
          payment_id?: string | null;
          order_id?: string | null;
          amount?: number;
          completed_modules?: string[];
          current_module?: string | null;
          overall_percent?: number;
          total_watch_time?: number;
          enrolled_at?: string;
          last_accessed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'enrollments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };
      progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          module_id: string;
          timestamp: number;
          completed: boolean;
          completed_at: string | null;
          watch_time: number;
          view_count: number;
          last_updated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          module_id: string;
          timestamp?: number;
          completed?: boolean;
          completed_at?: string | null;
          watch_time?: number;
          view_count?: number;
          last_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          module_id?: string;
          timestamp?: number;
          completed?: boolean;
          completed_at?: string | null;
          watch_time?: number;
          view_count?: number;
          last_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'progress_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          }
        ];
      };
      certificates: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          certificate_number: string;
          student_name: string;
          course_title: string;
          issue_date: string;
          completion_date: string;
          download_url: string | null;
          pdf_data: string | null;
          status: 'ACTIVE' | 'REVOKED';
          revoked_at: string | null;
          revoked_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          certificate_number: string;
          student_name: string;
          course_title: string;
          issue_date?: string;
          completion_date?: string;
          download_url?: string | null;
          pdf_data?: string | null;
          status?: 'ACTIVE' | 'REVOKED';
          revoked_at?: string | null;
          revoked_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          certificate_number?: string;
          student_name?: string;
          course_title?: string;
          issue_date?: string;
          completion_date?: string;
          download_url?: string | null;
          pdf_data?: string | null;
          status?: 'ACTIVE' | 'REVOKED';
          revoked_at?: string | null;
          revoked_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'certificates_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'certificates_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          rating: number;
          comment: string | null;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          rating: number;
          comment?: string | null;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          rating?: number;
          comment?: string | null;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'enrollment' | 'milestone' | 'certificate' | 'announcement' | 'review';
          title: string;
          message: string;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'enrollment' | 'milestone' | 'certificate' | 'announcement' | 'review';
          title: string;
          message: string;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'enrollment' | 'milestone' | 'certificate' | 'announcement' | 'review';
          title?: string;
          message?: string;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          access_token: string;
          ip_address: string | null;
          user_agent: string | null;
          device_info: string | null;
          expires_at: string;
          is_active: boolean;
          last_activity: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          access_token: string;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: string | null;
          expires_at: string;
          is_active?: boolean;
          last_activity?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          access_token?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: string | null;
          expires_at?: string;
          is_active?: boolean;
          last_activity?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      refresh_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          is_revoked: boolean;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          is_revoked?: boolean;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          is_revoked?: boolean;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'refresh_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      login_attempts: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          ip_address: string | null;
          user_agent: string | null;
          success: boolean;
          fail_reason: string | null;
          attempt_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          success: boolean;
          fail_reason?: string | null;
          attempt_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          success?: boolean;
          fail_reason?: string | null;
          attempt_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'login_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {};
    Functions: {
      complete_module: {
        Args: { p_user_id: string; p_module_id: string; p_course_id: string };
        Returns: Json;
      };
      get_admin_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_sales_data: {
        Args: { p_days?: number };
        Returns: { date: string; amount: number; count: number }[];
      };
      get_recent_activity: {
        Args: { p_limit?: number };
        Returns: Json;
      };
      get_progress_stats: {
        Args: { p_user_id: string; p_course_id: string };
        Returns: Json;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'USER' | 'ADMIN';
      course_type: 'BUNDLE' | 'MODULE';
      course_status: 'PUBLISHED' | 'DRAFT';
      enrollment_status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING';
      certificate_status: 'ACTIVE' | 'REVOKED';
      notification_type: 'enrollment' | 'milestone' | 'certificate' | 'announcement' | 'review';
    };
  };
}
