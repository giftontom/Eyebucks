/**
 * Progress API - Direct Supabase PostgREST queries + Edge Function for completion
 * Replaces: progressService + apiClient progress methods
 */
import { supabase } from '../supabase';

import type { Progress, ProgressStats } from '../../types';
import type { ProgressRow } from '../../types/supabase';

const COMPLETION_THRESHOLD = 0.95;

// Typed helper for custom RPCs not yet in generated schema types
const customRpc = (fn: string, args?: Record<string, unknown>) =>
  supabase.rpc(fn as never, args as never) as unknown as Promise<{ error: { message: string } | null }>;
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
   * Saves the video watch position and increments `view_count` for the first save of a session.
   *
   * On the first call for a given module in a viewing session, calls the `increment_view_count`
   * RPC for an atomic increment. If the RPC fails (not yet deployed), falls back to a plain
   * UPDATE. On subsequent calls within the session, use `updateTimestamp()` instead to avoid
   * double-counting views.
   *
   * @param courseId - UUID of the course containing the module.
   * @param moduleId - UUID of the module being watched.
   * @param timestamp - Current video position in seconds.
   *
   * @example
   * ```ts
   * // Called on first auto-save tick of a viewing session
   * await progressApi.saveProgress(courseId, moduleId, videoRef.current.currentTime);
   * ```
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
      const { error: rpcError } = await customRpc('increment_view_count', {
        p_user_id: user.id,
        p_course_id: courseId,
        p_module_id: moduleId,
        p_timestamp: timestamp,
      });

      // Fallback if RPC doesn't exist yet — must be awaited to avoid silent failure
      if (rpcError) {
        await supabase
          .from('progress')
          .update({ timestamp, last_updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('module_id', moduleId);
      }
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
   * Updates the video position timestamp without incrementing `view_count`.
   *
   * Used for all auto-saves after the first one within a single viewing session.
   * The `useModuleProgress` hook tracks which modules have had their view counted
   * and calls this method for subsequent 30-second auto-saves.
   *
   * @param courseId - UUID of the course containing the module.
   * @param moduleId - UUID of the module being watched.
   * @param timestamp - Current video position in seconds.
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
   * Marks a module as complete via the `progress-complete` Edge Function.
   *
   * The Edge Function calls the `complete_module()` RPC atomically. If this completes
   * 100% of the course, `certificate-generate` is triggered and a certificate notification
   * is sent. Milestone notifications are sent at 25%, 50%, and 75% course completion.
   *
   * @param courseId - UUID of the course containing the module.
   * @param moduleId - UUID of the module to mark complete.
   * @param currentTime - Optional current video position (seconds); used for server-side
   *   threshold validation.
   * @param duration - Optional total video duration (seconds); used for threshold validation.
   * @returns Object with `success: true`, updated `progress` record, and `stats` summary.
   * @throws {Error} If the Edge Function returns an error.
   *
   * @example
   * ```ts
   * const result = await progressApi.markComplete(courseId, moduleId, 285, 300);
   * if (result.stats?.overallPercent === 100) {
   *   // Course complete — certificate will be generated
   * }
   * ```
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
   * Checks if the watch percentage meets the completion threshold and marks the module complete.
   *
   * Returns `false` immediately if `duration` is 0 or the watch percentage is below
   * `COMPLETION_THRESHOLD` (95%). If the threshold is met and the module is not yet
   * complete, calls `markComplete()`.
   *
   * @param courseId - UUID of the course.
   * @param moduleId - UUID of the module to check.
   * @param currentTime - Current video position in seconds.
   * @param duration - Total video duration in seconds.
   * @returns `true` if the module was newly marked complete; `false` otherwise.
   *
   * @example
   * ```ts
   * const wasCompleted = await progressApi.checkCompletion(courseId, moduleId, 285, 300);
   * if (wasCompleted) analytics.track('module_completed', { course_id: courseId });
   * ```
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
   * Fetches aggregated progress statistics for the current user and a course via the
   * `get_progress_stats` RPC.
   *
   * @param courseId - UUID of the course.
   * @returns `ProgressStats` with `completedModules`, `totalModules`, `overallPercent`,
   *   `totalWatchTime`, and `currentModule`. Returns zeroed stats if the user is not
   *   authenticated or the RPC fails.
   *
   * @example
   * ```ts
   * const stats = await progressApi.getCourseStats(courseId);
   * console.log(`${stats.overallPercent}% complete`);
   * ```
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
