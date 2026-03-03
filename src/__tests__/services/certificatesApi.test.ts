import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  return { mockSupabase };
});

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

import { certificatesApi } from '../../../services/api/certificates.api';

describe('certificatesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserCertificates', () => {
    it('should throw when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      await expect(certificatesApi.getUserCertificates()).rejects.toThrow('Not authenticated');
    });

    it('should return mapped certificates', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'cert-1',
                    user_id: 'user-1',
                    course_id: 'course-1',
                    certificate_number: 'EYB-001',
                    student_name: 'John Doe',
                    course_title: 'Filmmaking 101',
                    issue_date: '2024-06-01T00:00:00Z',
                    completion_date: '2024-05-30T00:00:00Z',
                    download_url: null,
                    status: 'ACTIVE',
                    revoked_at: null,
                    revoked_reason: null,
                    created_at: '2024-06-01T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const certs = await certificatesApi.getUserCertificates();
      expect(certs).toHaveLength(1);
      expect(certs[0].certificateNumber).toBe('EYB-001');
      expect(certs[0].studentName).toBe('John Doe');
      expect(certs[0].courseTitle).toBe('Filmmaking 101');
      expect(certs[0].issueDate).toBeInstanceOf(Date);
    });

    it('should return empty array when no certificates', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      });

      const certs = await certificatesApi.getUserCertificates();
      expect(certs).toEqual([]);
    });
  });

  describe('getCertificate', () => {
    it('should return null when not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const cert = await certificatesApi.getCertificate('nonexistent');
      expect(cert).toBeNull();
    });

    it('should return certificate by ID', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'cert-1',
                user_id: 'u1',
                course_id: 'c1',
                certificate_number: 'EYB-002',
                student_name: 'Jane',
                course_title: 'Course',
                issue_date: '2024-01-01',
                status: 'ACTIVE',
                created_at: '2024-01-01',
              },
              error: null,
            }),
          }),
        }),
      });

      const cert = await certificatesApi.getCertificate('cert-1');
      expect(cert).not.toBeNull();
      expect(cert!.certificateNumber).toBe('EYB-002');
    });
  });
});
