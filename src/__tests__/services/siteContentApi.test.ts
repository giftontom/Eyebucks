import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

import { siteContentApi } from '../../../services/api/siteContent.api';

const mockRow = {
  id: 'sc1',
  section: 'faq',
  title: 'What is Eyebuckz?',
  body: 'An LMS platform.',
  metadata: { key: 'val' },
  order_index: 1,
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('siteContentApi', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getBySection', () => {
    it('should return items for a section', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
            }),
          }),
        }),
      });

      const result = await siteContentApi.getBySection('faq');
      expect(result).toHaveLength(1);
      expect(result[0].section).toBe('faq');
      expect(result[0].title).toBe('What is Eyebuckz?');
      expect(result[0].isActive).toBe(true);
    });

    it('should throw on DB error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      });

      await expect(siteContentApi.getBySection('faq')).rejects.toThrow('DB error');
    });
  });

  describe('create', () => {
    it('should insert and return mapped item', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
          }),
        }),
      });

      const result = await siteContentApi.create({
        section: 'faq',
        title: 'What is Eyebuckz?',
        body: 'An LMS platform.',
      });

      expect(result.id).toBe('sc1');
      expect(result.orderIndex).toBe(1);
    });

    it('should throw on DB error', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
          }),
        }),
      });

      await expect(siteContentApi.create({ section: 'faq', title: 'T', body: 'B' })).rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    it('should update and return item', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { ...mockRow, title: 'Updated' }, error: null }),
            }),
          }),
        }),
      });

      const result = await siteContentApi.update('sc1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete by id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await expect(siteContentApi.delete('sc1')).resolves.toBeUndefined();
      expect(eqMock).toHaveBeenCalledWith('id', 'sc1');
    });

    it('should throw on DB error', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      await expect(siteContentApi.delete('sc1')).rejects.toThrow('Delete failed');
    });
  });

  describe('getAll', () => {
    it('should return paginated items', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [mockRow], error: null, count: 1 }),
            }),
          }),
        }),
      });

      const result = await siteContentApi.getAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty items when data is null', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
            }),
          }),
        }),
      });

      const result = await siteContentApi.getAll();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('reorder', () => {
    it('should call update for each id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ error: null });
      const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await siteContentApi.reorder(['sc1', 'sc2', 'sc3']);
      expect(updateMock).toHaveBeenCalledTimes(3);
    });
  });
});
