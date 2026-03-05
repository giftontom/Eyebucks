/**
 * Certificates API - User-facing certificate queries
 */
import { supabase } from '../supabase';

import type { Certificate } from '../../types';
import type { CertificateRow } from '../../types/supabase';

function mapRow(row: CertificateRow): Certificate {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    certificateNumber: row.certificate_number,
    studentName: row.student_name,
    courseTitle: row.course_title,
    issueDate: new Date(row.issue_date),
    completionDate: new Date(row.completion_date || row.issue_date),
    downloadUrl: row.download_url,
    status: row.status,
    revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    revokedReason: row.revoked_reason,
    createdAt: new Date(row.created_at),
  };
}

export const certificatesApi = {
  async getUserCertificates(): Promise<Certificate[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {throw new Error('Not authenticated');}

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) {throw new Error(error.message);}
    return (data || []).map(mapRow);
  },

  async getCertificate(id: string): Promise<Certificate | null> {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {throw new Error(error.message);}
    return data ? mapRow(data) : null;
  },
};
