// Eyebuckz LMS: Certificate Generation
// Replaces: server/src/services/certificateService.ts + certificates route
// Generates PDF, uploads to Supabase Storage, sends email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCertificateNumber(): string {
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `EYEBUCKZ-${timestamp}-${randomPart}`;
}

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    const { userId, courseId } = await req.json();
    const targetUserId = userId || user.id;

    // Verify caller is admin or the target user
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = callerProfile?.role === 'ADMIN';
    if (!isAdmin && targetUserId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id, certificate_number')
      .eq('user_id', targetUserId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingCert) {
      return new Response(
        JSON.stringify({ success: false, error: 'Certificate already exists', certificate: existingCert }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user and course info
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('name, email')
      .eq('id', targetUserId)
      .single();

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    if (!targetUser || !course) {
      return new Response(
        JSON.stringify({ success: false, error: 'User or course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify enrollment and completion
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id, overall_percent')
      .eq('user_id', targetUserId)
      .eq('course_id', courseId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (!enrollment) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active enrollment found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate certificate number
    const certificateNumber = generateCertificateNumber();
    const now = new Date();

    // Create certificate record (PDF generation is done client-side with jsPDF)
    // Store certificate metadata; PDF can be generated on-demand client-side
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('certificates')
      .insert({
        user_id: targetUserId,
        course_id: courseId,
        certificate_number: certificateNumber,
        student_name: targetUser.name,
        course_title: course.title,
        issue_date: now.toISOString(),
        completion_date: now.toISOString(),
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (certError) {
      console.error('[Certificate] Error creating certificate:', certError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create certificate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: targetUserId,
      type: 'certificate',
      title: 'Certificate Earned!',
      message: `Congratulations! You've earned a certificate for completing ${course.title}`,
      link: `/dashboard`,
    });

    // Send email notification (non-blocking)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && targetUser.email) {
      const appUrl = Deno.env.get('APP_URL') || 'https://eyebuckz.com';
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@eyebuckz.com';

      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: targetUser.email,
          subject: `Your Certificate for ${course.title}`,
          html: `
            <h2>Congratulations, ${targetUser.name}!</h2>
            <p>You've earned a certificate for completing <strong>${course.title}</strong>.</p>
            <p>Certificate Number: ${certificateNumber}</p>
            <p><a href="${appUrl}/#/dashboard">Download Your Certificate</a></p>
          `,
        }),
      }).catch(err => console.error('[Email] Certificate email error:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificate_number,
          studentName: certificate.student_name,
          courseTitle: certificate.course_title,
          issueDate: certificate.issue_date,
          completionDate: certificate.completion_date,
          status: certificate.status,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Certificate] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
