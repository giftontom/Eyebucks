// Eyebuckz LMS: Progress - Complete Module
// Replaces: PATCH /api/progress/complete
// Uses atomic complete_module() database function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth } from '../_shared/auth.ts';
import { generateCertificateNumber } from '../_shared/certificates.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const COMPLETION_THRESHOLD = 0.95; // 95% watch threshold — must match frontend

/**
 * progress-complete Edge Function — marks a module complete and triggers course completion logic.
 *
 * Auth: JWT required.
 * Method: POST
 *
 * Request body:
 * ```json
 * { "moduleId": "uuid", "courseId": "uuid", "currentTime": 285, "duration": 300 }
 * ```
 *
 * `currentTime` and `duration` are optional but recommended. If provided, the function
 * validates that the user has watched at least `COMPLETION_THRESHOLD` (95%) of the video.
 *
 * Response (success):
 * ```json
 * { "success": true, "progress": { ... }, "stats": { "completedModules": 5, "totalModules": 8, "overallPercent": 62 } }
 * ```
 *
 * Side effects:
 * - Calls `complete_module(user_id, module_id, course_id)` RPC atomically
 * - If `overallPercent >= 100`: upserts a row in `certificates` (ignoreDuplicates for concurrent safety),
 *   inserts `certificate` notification, sends completion email via Resend
 * - At 25%, 50%, 75% milestones: inserts `milestone` notification (idempotent check)
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) {return auth.errorResponse;}
    const { user } = auth;

    const { moduleId, courseId, currentTime, duration } = await req.json();

    if (!moduleId || !courseId) {
      return errorResponse('moduleId and courseId are required', corsHeaders, 400);
    }

    // Optional: validate watch threshold
    if (duration && currentTime) {
      const watchPercent = currentTime / duration;
      if (watchPercent < COMPLETION_THRESHOLD) {
        return errorResponse(
          `Must watch at least ${COMPLETION_THRESHOLD * 100}% of the video`,
          corsHeaders,
          400
        );
      }
    }

    const supabaseAdmin = createAdminClient();

    // Call atomic database function
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('complete_module', {
      p_user_id: user.id,
      p_module_id: moduleId,
      p_course_id: courseId,
    });

    if (rpcError) {
      console.error('[Progress] RPC error:', rpcError);
      return errorResponse('Failed to complete module', corsHeaders, 500);
    }

    // Check if course is now fully completed -> trigger certificate
    if (result && result.percent >= 100) {
      // Check if certificate already exists
      const { data: existingCert } = await supabaseAdmin
        .from('certificates')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!existingCert) {
        // Auto-generate certificate by calling the certificate-generate function
        // We do this via a direct DB insert since we're already in a service context
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('name, email')
          .eq('id', user.id)
          .single();

        const { data: course } = await supabaseAdmin
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single();

        if (userProfile && course) {
          const certNumber = generateCertificateNumber();
          const appUrl = Deno.env.get('APP_URL') || 'https://eyebuckz.com';

          // Use upsert with ignoreDuplicates to handle concurrent requests safely.
          // The unique constraint on (user_id, course_id) prevents duplicate certificates.
          const { error: certInsertError } = await supabaseAdmin
            .from('certificates')
            .upsert({
              user_id: user.id,
              course_id: courseId,
              certificate_number: certNumber,
              student_name: userProfile.name,
              course_title: course.title,
              issue_date: new Date().toISOString(),
              completion_date: new Date().toISOString(),
              status: 'ACTIVE',
            }, { onConflict: 'user_id,course_id', ignoreDuplicates: true });

          // If a concurrent request already inserted, skip notification/email
          if (certInsertError) {
            console.error('[Progress] Certificate insert error:', certInsertError);
          } else {

          // Create certificate notification
          await supabaseAdmin.from('notifications').insert({
            user_id: user.id,
            type: 'certificate',
            title: 'Course Completed!',
            message: `Congratulations! You've completed ${course.title} and earned a certificate!`,
            link: '/dashboard',
          });

          // Send completion email (non-blocking)
          if (userProfile.email) {
            sendEmail(
              userProfile.email,
              `You've completed ${course.title}! 🎓`,
              `
                <h2>Congratulations, ${userProfile.name}!</h2>
                <p>You've successfully completed <strong>${course.title}</strong> on Eyebuckz.</p>
                <p>Your certificate (No. ${certNumber}) is ready to download from your dashboard.</p>
                <p style="margin-top:24px;">
                  <a href="${appUrl}/#/dashboard" style="background:#e53935;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
                    View Certificate
                  </a>
                </p>
                <p style="margin-top:32px;color:#888;font-size:12px;">Keep learning — explore more courses at <a href="${appUrl}">eyebuckz.com</a></p>
              `
            );
          }
          } // end else (certInsertError)
        }
      }
    }

    // Create milestone notification on first crossing of 25%, 50%, 75%
    if (result && result.percent < 100) {
      const milestones = [25, 50, 75];
      const percent = result.percent;

      for (const milestone of milestones) {
        if (percent >= milestone) {
          // Check if this milestone notification was already sent
          const { data: existing } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'milestone')
            .eq('title', `${milestone}% Complete!`)
            .maybeSingle();

          if (!existing) {
            await supabaseAdmin.from('notifications').insert({
              user_id: user.id,
              type: 'milestone',
              title: `${milestone}% Complete!`,
              message: `You're ${milestone}% through the course. Keep going!`,
              link: `/learn/${courseId}`,
            });
          }
        }
      }
    }

    // Get updated progress record
    const { data: progress } = await supabaseAdmin
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('module_id', moduleId)
      .single();

    return jsonResponse({
      success: true,
      progress,
      stats: result ? {
        completedModules: result.completed_count,
        totalModules: result.total_modules,
        overallPercent: result.percent,
      } : undefined,
    }, corsHeaders);
  } catch (error) {
    console.error('[Progress Complete] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
