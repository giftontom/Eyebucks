// Eyebuckz LMS: Progress - Complete Module
// Replaces: PATCH /api/progress/complete
// Uses atomic complete_module() database function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMPLETION_THRESHOLD = 0.90; // 90% watch threshold

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { moduleId, courseId, currentTime, duration } = await req.json();

    if (!moduleId || !courseId) {
      return new Response(
        JSON.stringify({ success: false, error: 'moduleId and courseId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optional: validate watch threshold
    if (duration && currentTime) {
      const watchPercent = currentTime / duration;
      if (watchPercent < COMPLETION_THRESHOLD) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Must watch at least ${COMPLETION_THRESHOLD * 100}% of the video`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Call atomic database function
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('complete_module', {
      p_user_id: user.id,
      p_module_id: moduleId,
      p_course_id: courseId,
    });

    if (rpcError) {
      console.error('[Progress] RPC error:', rpcError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to complete module' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
          const randomBytes = new Uint8Array(6);
          crypto.getRandomValues(randomBytes);
          const randomPart = Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
          const timestamp = Date.now().toString(36).toUpperCase();
          const certNumber = `EYEBUCKZ-${timestamp}-${randomPart}`;

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

    return new Response(
      JSON.stringify({
        success: true,
        progress,
        stats: result ? {
          completedModules: result.completed_count,
          totalModules: result.total_modules,
          overallPercent: result.percent,
        } : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Progress Complete] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
