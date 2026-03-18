// Eyebuckz LMS: Certificate Generation
// Replaces: server/src/services/certificateService.ts + certificates route
// Generates certificate record, sends email notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

import { verifyAuth, verifyAdmin } from '../_shared/auth.ts';
import { generateCertificateNumber } from '../_shared/certificates.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/email.ts';
import { certificateEmail } from '../_shared/emailTemplates.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

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

    const supabaseAdmin = createAdminClient();

    const { userId, courseId } = await req.json();
    const targetUserId = userId || user.id;

    // Verify caller is admin or the target user
    const isAdmin = await verifyAdmin(user.id, supabaseAdmin);
    if (!isAdmin && targetUserId !== user.id) {
      return errorResponse('Forbidden', corsHeaders, 403);
    }

    // Check if certificate already exists (idempotent — return existing cert)
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id, certificate_number, student_name, course_title, issue_date, completion_date, status')
      .eq('user_id', targetUserId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingCert) {
      return jsonResponse(
        {
          success: true,
          certificate: {
            id: existingCert.id,
            certificateNumber: existingCert.certificate_number,
            studentName: existingCert.student_name,
            courseTitle: existingCert.course_title,
            issueDate: existingCert.issue_date,
            completionDate: existingCert.completion_date,
            status: existingCert.status,
          },
        },
        corsHeaders
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
      return errorResponse('User or course not found', corsHeaders, 404);
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
      return errorResponse('No active enrollment found', corsHeaders, 400);
    }

    // Require course completion (admin can override)
    if (!isAdmin && (enrollment.overall_percent || 0) < 100) {
      return errorResponse(
        `Course not yet completed (${enrollment.overall_percent || 0}% done). Complete all modules first.`,
        corsHeaders,
        400
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
      return errorResponse('Failed to create certificate', corsHeaders, 500);
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
    if (targetUser.email) {
      const appUrl = Deno.env.get('APP_URL') || 'https://eyebuckz.com';
      sendEmail(
        targetUser.email,
        `You've completed ${course.title} — Certificate Ready`,
        certificateEmail({
          name: targetUser.name,
          courseTitle: course.title,
          certificateNumber,
          dashboardUrl: `${appUrl}/#/dashboard`,
          appUrl,
        })
      );
    }

    return jsonResponse({
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
    }, corsHeaders);
  } catch (error) {
    console.error('[Certificate] Error:', error);
    const corsHeaders = getCorsHeaders(req);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
