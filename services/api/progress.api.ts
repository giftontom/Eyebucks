/**
 * Progress API - Direct Supabase PostgREST queries + Edge Function for completion
 * Replaces: progressService + apiClient progress methods
 */
import { supabase } from '../supabase';

import type { Progress, ProgressStats } from '../../types';
import type { ProgressRow } from '../../types/supabase';

const COMPLETION_THRESHOLD = 0.95;
const AUTO_SAVE_INTERVAL = 30000;

interface ModuleProgress {
  moduleId: string;
  lastTimestamp: number;
  completed: boolean;
  completedAt: Date | string | null;
  watchTime: number;
  viewCount: number;
  lastUpdatedAt: string;
}

function mapProgress(row: ProgressRow): Progress {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    moduleId: row.module_id,
    timestamp: row.timestamp || 0,
    completed: row.completed || false,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    watchTime: row.watch_time || 0,
    viewCount: row.view_count || 0,
    lastUpdatedAt: new Date(row.last_updated_at || row.updated_at),
  };
}

export const progressApi = {
  /**
   * Save progress checkpoint for a module
   */
  async saveProgress(courseId: string, moduleId: string, timestamp: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return;}

    // Try update first (increment view_count atomically)
    const { data: existing } = await supabase
      .from('progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (existing) {
      // Update existing record — use RPC-style raw update for atomic increment
      await (supabase.rpc as any)('increment_view_count', {
        p_user_id: user.id,
        p_course_id: courseId,
        p_module_id: moduleId,
        p_timestamp: timestamp,
      }).then(({ error: rpcError }: { error: any }) => {
        // Fallback if RPC doesn't exist yet
        if (rpcError) {
          return supabase
            .from('progress')
            .update({ timestamp, last_updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .eq('module_id', moduleId);
        }
      });
    } else {
      // Insert new record with view_count = 1
      await supabase
        .from('progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          module_id: moduleId,
          timestamp,
          last_updated_at: new Date().toISOString(),
          view_count: 1,
        });
    }
  },

  /**
   * Update progress timestamp without incrementing view_count
   * Used for subsequent auto-saves within the same viewing session
   */
  async updateTimestamp(courseId: string, moduleId: string, timestamp: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return;}

    await supabase
      .from('progress')
      .update({ timestamp, last_updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId);
  },

  /**
   * Mark a module as completed (calls Edge Function for atomic operation)
   */
  async markComplete(courseId: string, moduleId: string, currentTime?: number, duration?: number): Promise<{
    success: boolean;
    progress?: Progress;
    stats?: ProgressStats;
  }> {
    const { data, error } = await supabase.functions.invoke('progress-complete', {
      body: { courseId, moduleId, currentTime, duration },
    });

    if (error) {throw new Error(error.message);}
    return data;
  },

  /**
   * Check if module should be marked complete based on watch progress
   */
  async checkCompletion(
    courseId: string,
    moduleId: string,
    currentTime: number,
    duration: number
  ): Promise<boolean> {
    if (duration === 0) {return false;}
    const watchPercent = currentTime / duration;

    if (watchPercent >= COMPLETION_THRESHOLD) {
      const moduleProgress = await progressApi.getModuleProgress(courseId, moduleId);
      if (!moduleProgress || !moduleProgress.completed) {
        await progressApi.markComplete(courseId, moduleId, currentTime, duration);
        return true;
      }
    }
    return false;
  },

  /**
   * Get module progress
   */
  async getModuleProgress(courseId: string, moduleId: string): Promise<ModuleProgress | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return null;}

    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (error || !data) {return null;}

    return {
      moduleId: data.module_id,
      lastTimestamp: data.timestamp || 0,
      completed: data.completed || false,
      completedAt: data.completed_at,
      watchTime: data.watch_time || 0,
      viewCount: data.view_count || 0,
      lastUpdatedAt: data.last_updated_at || data.updated_at,
    };
  },

  /**
   * Get resume position for a module
   */
  async getResumePosition(courseId: string, moduleId: string): Promise<number> {
    const progress = await progressApi.getModuleProgress(courseId, moduleId);
    return progress?.lastTimestamp || 0;
  },

  /**
   * Get all progress for a course
   */
  async getProgress(courseId: string): Promise<ModuleProgress[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return [];}

    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (error) {return [];}

    return (data || []).map(p => ({
      moduleId: p.module_id,
      lastTimestamp: p.timestamp || 0,
      completed: p.completed || false,
      completedAt: p.completed_at,
      watchTime: p.watch_time || 0,
      viewCount: p.view_count || 0,
      lastUpdatedAt: p.last_updated_at || p.updated_at,
    }));
  },

  /**
   * Get course stats via RPC
   */
  async getCourseStats(courseId: string): Promise<ProgressStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { completedModules: 0, totalModules: 0, overallPercent: 0, totalWatchTime: 0, currentModule: null };
    }

    const { data, error } = await supabase.rpc('get_progress_stats', {
      p_user_id: user.id,
      p_course_id: courseId,
    });

    if (error || !data) {
      return { completedModules: 0, totalModules: 0, overallPercent: 0, totalWatchTime: 0, currentModule: null };
    }

    return data as unknown as ProgressStats;
  },

  /**
   * Update current module in enrollment
   */
  async updateCurrentModule(courseId: string, moduleId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return;}

    await supabase
      .from('enrollments')
      .update({ current_module: moduleId })
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('status', 'ACTIVE');
  },

  /**
   * Clear all progress for a course (testing)
   */
  async clearProgress(courseId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return;}

    await supabase
      .from('progress')
      .delete()
      .eq('user_id', user.id)
      .eq('course_id', courseId);
  },
};

export { AUTO_SAVE_INTERVAL, COMPLETION_THRESHOLD };
