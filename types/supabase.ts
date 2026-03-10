export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bundle_courses: {
        Row: {
          bundle_id: string
          course_id: string
          created_at: string | null
          order_index: number
        }
        Insert: {
          bundle_id: string
          course_id: string
          created_at?: string | null
          order_index?: number
        }
        Update: {
          bundle_id?: string
          course_id?: string
          created_at?: string | null
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_courses_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          completion_date: string
          course_id: string
          course_title: string
          created_at: string | null
          download_url: string | null
          id: string
          issue_date: string
          pdf_data: string | null
          revoked_at: string | null
          revoked_reason: string | null
          status: Database["public"]["Enums"]["certificate_status"] | null
          student_name: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          completion_date?: string
          course_id: string
          course_title: string
          created_at?: string | null
          download_url?: string | null
          id?: string
          issue_date?: string
          pdf_data?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          student_name: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          completion_date?: string
          course_id?: string
          course_title?: string
          created_at?: string | null
          download_url?: string | null
          id?: string
          issue_date?: string
          pdf_data?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: Database["public"]["Enums"]["certificate_status"] | null
          student_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          course_id: string
          discount_pct: number
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          course_id: string
          discount_pct: number
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          course_id?: string
          discount_pct?: number
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_pct: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          use_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_pct: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_pct?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          use_count?: number
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string
          features: string[] | null
          hero_video_id: string | null
          id: string
          price: number
          published_at: string | null
          rating: number | null
          slug: string
          status: Database["public"]["Enums"]["course_status"] | null
          thumbnail: string
          title: string
          total_students: number | null
          type: Database["public"]["Enums"]["course_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description: string
          features?: string[] | null
          hero_video_id?: string | null
          id?: string
          price: number
          published_at?: string | null
          rating?: number | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"] | null
          thumbnail?: string
          title: string
          total_students?: number | null
          type: Database["public"]["Enums"]["course_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string
          features?: string[] | null
          hero_video_id?: string | null
          id?: string
          price?: number
          published_at?: string | null
          rating?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"] | null
          thumbnail?: string
          title?: string
          total_students?: number | null
          type?: Database["public"]["Enums"]["course_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          amount: number | null
          completed_modules: string[] | null
          course_id: string
          created_at: string | null
          current_module: string | null
          enrolled_at: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          order_id: string | null
          overall_percent: number | null
          payment_id: string | null
          status: Database["public"]["Enums"]["enrollment_status"] | null
          total_watch_time: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          completed_modules?: string[] | null
          course_id: string
          created_at?: string | null
          current_module?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          order_id?: string | null
          overall_percent?: number | null
          payment_id?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          total_watch_time?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          completed_modules?: string[] | null
          course_id?: string
          created_at?: string | null
          current_module?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          order_id?: string | null
          overall_percent?: number | null
          payment_id?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          total_watch_time?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_at: string | null
          email: string | null
          fail_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempt_at?: string | null
          email?: string | null
          fail_reason?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_at?: string | null
          email?: string | null
          fail_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string | null
          duration: string | null
          duration_seconds: number | null
          id: string
          is_free_preview: boolean | null
          order_index: number
          title: string
          updated_at: string | null
          video_id: string | null
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          duration?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean | null
          order_index: number
          title: string
          updated_at?: string | null
          video_id?: string | null
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          duration?: string | null
          duration_seconds?: number | null
          id?: string
          is_free_preview?: boolean | null
          order_index?: number
          title?: string
          updated_at?: string | null
          video_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string | null
          currency: string
          enrollment_id: string | null
          id: string
          metadata: Json | null
          method: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          receipt_number: string | null
          refund_amount: number | null
          refund_id: string | null
          refund_reason: string | null
          refunded_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          course_id?: string | null
          created_at?: string | null
          currency?: string
          enrollment_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          receipt_number?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string | null
          currency?: string
          enrollment_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          receipt_number?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          last_updated_at: string | null
          module_id: string
          timestamp: number | null
          updated_at: string | null
          user_id: string
          view_count: number | null
          watch_time: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          last_updated_at?: string | null
          module_id: string
          timestamp?: number | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          watch_time?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          last_updated_at?: string | null
          module_id?: string
          timestamp?: number | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          watch_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string | null
          helpful: number | null
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string | null
          helpful?: number | null
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string | null
          helpful?: number | null
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          order_index: number
          section: string
          title: string
          updated_at: string | null
        }
        Insert: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          order_index?: number
          section: string
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          order_index?: number
          section?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar: string | null
          created_at: string | null
          email: string
          email_verified: boolean | null
          failed_login_attempts: number | null
          google_id: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          locked_until: string | null
          name: string
          phone_e164: string | null
          phone_verified: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          email: string
          email_verified?: boolean | null
          failed_login_attempts?: number | null
          google_id?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          name: string
          phone_e164?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          email?: string
          email_verified?: boolean | null
          failed_login_attempts?: number | null
          google_id?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          name?: string
          phone_e164?: string | null
          phone_verified?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_coupon: {
        Args: { p_code: string; p_course_id: string; p_user_id: string }
        Returns: {
          coupon_use_id: string
          discount_pct: number
        }[]
      }
      complete_module: {
        Args: { p_course_id: string; p_module_id: string; p_user_id: string }
        Returns: Json
      }
      expire_enrollments: { Args: never; Returns: number }
      generate_receipt_number: { Args: never; Returns: string }
      get_admin_stats: { Args: never; Returns: Json }
      get_course_analytics: { Args: { p_course_id: string }; Returns: Json }
      get_progress_stats: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: Json
      }
      get_recent_activity: { Args: { p_limit?: number }; Returns: Json }
      get_sales_data: {
        Args: { p_days?: number }
        Returns: {
          amount: number
          count: number
          date: string
        }[]
      }
      increment_view_count: {
        Args: {
          p_course_id: string
          p_module_id: string
          p_timestamp?: number
          p_user_id: string
        }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      reorder_modules: {
        Args: { p_course_id: string; p_module_ids: string[] }
        Returns: undefined
      }
      save_progress_timestamp: {
        Args: {
          p_course_id: string
          p_module_id: string
          p_timestamp?: number
          p_user_id: string
        }
        Returns: undefined
      }
      set_bundle_courses: {
        Args: { p_bundle_id: string; p_course_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      certificate_status: "ACTIVE" | "REVOKED"
      course_status: "PUBLISHED" | "DRAFT"
      course_type: "BUNDLE" | "MODULE"
      enrollment_status: "ACTIVE" | "EXPIRED" | "REVOKED" | "PENDING"
      notification_type:
        | "enrollment"
        | "milestone"
        | "certificate"
        | "announcement"
        | "review"
      user_role: "USER" | "ADMIN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      certificate_status: ["ACTIVE", "REVOKED"],
      course_status: ["PUBLISHED", "DRAFT"],
      course_type: ["BUNDLE", "MODULE"],
      enrollment_status: ["ACTIVE", "EXPIRED", "REVOKED", "PENDING"],
      notification_type: [
        "enrollment",
        "milestone",
        "certificate",
        "announcement",
        "review",
      ],
      user_role: ["USER", "ADMIN"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

// Row type aliases for cleaner imports
export type UserRow = Database['public']['Tables']['users']['Row'];
export type CourseRow = Database['public']['Tables']['courses']['Row'];
export type ModuleRow = Database['public']['Tables']['modules']['Row'];
export type EnrollmentRow = Database['public']['Tables']['enrollments']['Row'];
export type ProgressRow = Database['public']['Tables']['progress']['Row'];
export type CertificateRow = Database['public']['Tables']['certificates']['Row'];
export type ReviewRow = Database['public']['Tables']['reviews']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type SiteContentRow = Database['public']['Tables']['site_content']['Row'];
export type BundleCourseRow = Database['public']['Tables']['bundle_courses']['Row'];
export type WishlistRow = Database['public']['Tables']['wishlists']['Row'];
export type CouponRow = Database['public']['Tables']['coupons']['Row'];
export type CouponUseRow = Database['public']['Tables']['coupon_uses']['Row'];

// Update type aliases for conditional update builders
export type CourseUpdate = Database['public']['Tables']['courses']['Update'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type EnrollmentUpdate = Database['public']['Tables']['enrollments']['Update'];
export type SiteContentUpdate = Database['public']['Tables']['site_content']['Update'];
export type ModuleUpdate = Database['public']['Tables']['modules']['Update'];
