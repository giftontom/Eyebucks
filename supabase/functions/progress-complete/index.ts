// Eyebuckz LMS: Progress - Complete Module
// Replaces: PATCH /api/progress/complete
// Uses atomic complete_module() database function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { generateCertificateNumber } from '../_shared/certificates.ts';

const COMPLETION_THRESHOLD = 0.95; // 95% watch threshold — must match frontend

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) return auth.errorResponse;
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

          await supabaseAdmin.from('certificates').insert({
            user_id: user.id,
            course_id: courseId,
            certificate_number: certNumber,
            student_name: userProfile.name,
            course_title: course.title,
            issue_date: new Date().toISOString(),
            completion_date: new Date().toISOString(),
            status: 'ACTIVE',
          });

          // Create certificate notification
          await supabaseAdmin.from('notifications').insert({
            user_id: user.id,
            type: 'certificate',
            title: 'Course Completed!',
            message: `Congratulations! You've completed ${course.title} and earned a certificate!`,
            link: '/dashboard',
          });
        }
      }
    }

    // Create milestone notification for partial completion
    if (result) {
      const milestones = [25, 50, 75];
      const percent = result.percent;

      for (const milestone of milestones) {
        if (percent >= milestone && percent < milestone + (100 / result.total_modules)) {
          await supabaseAdmin.from('notifications').insert({
            user_id: user.id,
            type: 'milestone',
            title: `${milestone}% Complete!`,
            message: `You're ${milestone}% through the course. Keep going!`,
            link: `/learn/${courseId}`,
          });
          break;
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
