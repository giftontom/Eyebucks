/**
 * Certificates API - User-facing certificate queries
 */
import { supabase } from '../supabase';

import type { Certificate } from '../../types';
import type { CertificateRow } from '../../types/supabase';

/** Public certificate verification result (verify_certificate RPC, migration 032). */
export interface CertificateVerification {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  issueDate: Date;
  status: 'ACTIVE' | 'REVOKED';
}

interface VerifyRow {
  certificate_number: string;
  student_name: string;
  course_title: string;
  issue_date: string;
  status: 'ACTIVE' | 'REVOKED';
}

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

  /**
   * Public certificate verification by exact number (anon-callable verify_certificate RPC).
   * Returns null if no certificate matches the number.
   */
  async verifyCertificate(certificateNumber: string): Promise<CertificateVerification | null> {
    const trimmed = certificateNumber.trim();
    if (!trimmed) {return null;}
    // verify_certificate RPC (migration 032) is not yet in the generated types. Retype the
    // CLIENT (not the method) so the call stays a member call and keeps its `this` binding.
    const client = supabase as unknown as {
      rpc: (fn: string, args: Record<string, string>) => Promise<{
        data: VerifyRow[] | null;
        error: { message: string } | null;
      }>;
    };
    const { data, error } = await client.rpc('verify_certificate', { p_cert_number: trimmed });
    if (error) {throw new Error(error.message);}
    const row = data && data.length > 0 ? data[0] : null;
    if (!row) {return null;}
    return {
      certificateNumber: row.certificate_number,
      studentName: row.student_name,
      courseTitle: row.course_title,
      issueDate: new Date(row.issue_date),
      status: row.status,
    };
  },
};
