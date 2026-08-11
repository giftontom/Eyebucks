// Shared course-access grant: creates the main enrollment and, for a BUNDLE,
// fans out to member courses (enrollments) and PUBLISHED member assets
// (asset_purchases). Used by course-claim-free so the free-claim path grants
// exactly what a paid checkout does. Idempotent (upserts with ignoreDuplicates).

import { createAdminClient } from './supabaseAdmin.ts';

type AdminClient = ReturnType<typeof createAdminClient>;

export interface GrantResult {
  enrollmentId: string | null;
  alreadyEnrolled: boolean;
  failedCourseIds: string[];
  failedAssetIds: string[];
}

export async function grantCourseAccess(
  admin: AdminClient,
  opts: {
    userId: string;
    courseId: string;
    courseType: 'BUNDLE' | 'MODULE';
    paymentId: string | null;
    orderId: string;
    amount: number;
  },
): Promise<GrantResult> {
  const { userId, courseId, courseType, paymentId, orderId, amount } = opts;
  const failedCourseIds: string[] = [];
  const failedAssetIds: string[] = [];

  // Main enrollment (idempotent).
  const { data: main } = await admin
    .from('enrollments')
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        status: 'ACTIVE',
        payment_id: paymentId,
        order_id: orderId,
        amount,
        enrolled_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle();

  let enrollmentId: string | null = main?.id ?? null;
  let alreadyEnrolled = false;
  if (!enrollmentId) {
    // Upsert ignored a duplicate — fetch the existing enrollment id.
    const { data: existing } = await admin
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    enrollmentId = existing?.id ?? null;
    alreadyEnrolled = true;
  }

  if (courseType === 'BUNDLE') {
    const { data: memberCourses } = await admin
      .from('bundle_courses').select('course_id').eq('bundle_id', courseId);
    for (const bc of memberCourses || []) {
      const { error } = await admin.from('enrollments').upsert(
        {
          user_id: userId,
          course_id: bc.course_id,
          status: 'ACTIVE',
          payment_id: paymentId,
          order_id: orderId,
          amount: 0,
          enrolled_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,course_id', ignoreDuplicates: true },
      );
      if (error) {
        console.error(`[grantCourseAccess] member enrollment failed for ${bc.course_id}:`, error);
        failedCourseIds.push(bc.course_id);
      }
    }

    // Only grant PUBLISHED, non-deleted assets (matches checkout-verify/webhook).
    const { data: memberAssets } = await admin
      .from('bundle_assets').select('asset_id').eq('bundle_id', courseId);
    const memberAssetIds = (memberAssets || []).map((r) => r.asset_id);
    const { data: grantable } = memberAssetIds.length > 0
      ? await admin.from('digital_assets').select('id')
          .in('id', memberAssetIds).eq('status', 'PUBLISHED').is('deleted_at', null)
      : { data: [] };
    for (const ga of grantable || []) {
      const { error } = await admin.from('asset_purchases').upsert(
        {
          user_id: userId,
          asset_id: ga.id,
          status: 'ACTIVE',
          payment_id: paymentId,
          order_id: orderId,
          amount: 0,
          purchased_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,asset_id', ignoreDuplicates: true },
      );
      if (error) {
        console.error(`[grantCourseAccess] member asset grant failed for ${ga.id}:`, error);
        failedAssetIds.push(ga.id);
      }
    }
  }

  return { enrollmentId, alreadyEnrolled, failedCourseIds, failedAssetIds };
}
