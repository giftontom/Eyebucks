import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('../../../services/supabase', () => ({ supabase: mockSupabase }));

// Silence logger.warn / logger.error noise in test output
vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { siteImagesApi } from '../../../services/api/siteImages.api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes).fill(0);
  return new File([content], name, { type });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('siteImagesApi', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── uploadImage ─────────────────────────────────────────────────────────────

  describe('uploadImage', () => {
    it('invokes admin-image-upload and returns {url, path} on success', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, url: 'https://cdn.example.com/misc/abc.jpg', path: 'misc/abc.jpg' },
        error: null,
      });

      const file = makeFile('photo.jpg', 'image/jpeg', 1024);
      const result = await siteImagesApi.uploadImage(file, 'misc');

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'admin-image-upload',
        expect.objectContaining({ body: expect.any(FormData) }),
      );
      expect(result).toEqual({ url: 'https://cdn.example.com/misc/abc.jpg', path: 'misc/abc.jpg' });
    });

    it('uses the supplied folder when invoking the function', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, url: 'https://cdn.example.com/instructors/x.png', path: 'instructors/x.png' },
        error: null,
      });

      const file = makeFile('photo.png', 'image/png', 512);
      await siteImagesApi.uploadImage(file, 'instructors');

      // FormData is opaque to direct property access, but at least the invoke
      // was called with a FormData body
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    // ── client-side validation: must NOT call invoke ─────────────────────────

    it('throws and does NOT invoke for an invalid MIME type', async () => {
      const file = makeFile('file.gif', 'image/gif', 1024);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow(
        /invalid image type/i,
      );
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws for image/bmp (not in allowed list) without calling invoke', async () => {
      const file = makeFile('file.bmp', 'image/bmp', 512);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow(
        /invalid image type/i,
      );
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws and does NOT invoke when the file exceeds 5 MB', async () => {
      const OVER_5MB = 5 * 1024 * 1024 + 1;
      const file = makeFile('big.jpg', 'image/jpeg', OVER_5MB);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow(/5mb/i);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws and does NOT invoke when the file is exactly 5 MB + 1 byte', async () => {
      const file = makeFile('big.webp', 'image/webp', 5 * 1024 * 1024 + 1);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow();
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('accepts a file exactly at the 5 MB boundary', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, url: 'https://cdn.example.com/misc/ok.webp', path: 'misc/ok.webp' },
        error: null,
      });
      const file = makeFile('ok.webp', 'image/webp', 5 * 1024 * 1024);
      await expect(siteImagesApi.uploadImage(file)).resolves.toMatchObject({ url: expect.any(String) });
    });

    // ── function call returns success:false ──────────────────────────────────

    it('throws when the Edge Function returns {success: false}', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false, error: 'Storage quota exceeded' },
        error: null,
      });

      const file = makeFile('photo.avif', 'image/avif', 100);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow(
        'Storage quota exceeded',
      );
    });

    it('throws the fallback message when success:false and no error string', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: false },
        error: null,
      });

      const file = makeFile('photo.jpg', 'image/jpeg', 100);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow(
        'Image upload failed',
      );
    });

    it('throws when the Edge Function returns data without url', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true }, // missing url
        error: null,
      });

      const file = makeFile('photo.jpg', 'image/jpeg', 100);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow(
        'Image upload failed',
      );
    });

    // ── Supabase invoke returns an error object ───────────────────────────────

    it('throws when supabase.functions.invoke returns an error', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });

      const file = makeFile('photo.jpg', 'image/jpeg', 100);
      await expect(siteImagesApi.uploadImage(file)).rejects.toThrow('Network error');
    });

    // ── valid MIME types should all be accepted ───────────────────────────────

    it.each([
      ['image/jpeg', 'photo.jpg'],
      ['image/png', 'photo.png'],
      ['image/webp', 'photo.webp'],
      ['image/avif', 'photo.avif'],
    ])('accepts %s and invokes the function', async (mimeType, filename) => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, url: `https://cdn.example.com/misc/${filename}`, path: `misc/${filename}` },
        error: null,
      });

      const file = makeFile(filename, mimeType, 512);
      await expect(siteImagesApi.uploadImage(file)).resolves.toMatchObject({ url: expect.any(String) });
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1);
    });
  });

  // ── deleteImage ──────────────────────────────────────────────────────────────

  describe('deleteImage', () => {
    it('invokes admin-image-upload with action:delete and the path', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });
      await siteImagesApi.deleteImage('instructors/photo.jpg');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'admin-image-upload',
        expect.objectContaining({ body: expect.objectContaining({ action: 'delete' }) }),
      );
    });

    it('accepts a full CDN URL and extracts the path for deletion', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });
      await siteImagesApi.deleteImage('https://cdn.example.com/instructors/photo.jpg');
      // Should not throw; path extracted from URL
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    it('swallows errors — never throws into caller', async () => {
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network failure'));
      await expect(siteImagesApi.deleteImage('misc/photo.jpg')).resolves.toBeUndefined();
    });

    it('swallows invoke error responses — never throws', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });
      // deleteImage treats invoke errors silently (it's best-effort)
      await expect(siteImagesApi.deleteImage('misc/photo.jpg')).resolves.toBeUndefined();
    });
  });

  // ── pathFromUrl ──────────────────────────────────────────────────────────────

  describe('pathFromUrl', () => {
    it('extracts the path segment from a full CDN URL', () => {
      expect(siteImagesApi.pathFromUrl('https://cdn.example.com/instructors/abc.jpg')).toBe(
        'instructors/abc.jpg',
      );
    });

    it('strips a leading slash from the pathname', () => {
      expect(siteImagesApi.pathFromUrl('https://cdn.example.com/misc/photo.png')).toBe(
        'misc/photo.png',
      );
    });

    it('returns null for an invalid URL', () => {
      expect(siteImagesApi.pathFromUrl('not-a-url')).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(siteImagesApi.pathFromUrl('')).toBeNull();
    });

    it('handles nested paths', () => {
      expect(siteImagesApi.pathFromUrl('https://cdn.b-cdn.net/testimonials/2024/user123.webp')).toBe(
        'testimonials/2024/user123.webp',
      );
    });
  });

  // ── uploadVideo ───────────────────────────────────────────────────────────────

  describe('uploadVideo', () => {
    it('invokes admin-image-upload and returns {url, path} for a valid mp4', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, url: 'https://cdn.b-cdn.net/hero/loop.mp4', path: 'hero/loop.mp4' },
        error: null,
      });

      const file = makeFile('loop.mp4', 'video/mp4', 2 * 1024 * 1024);
      const result = await siteImagesApi.uploadVideo(file, 'hero');

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'admin-image-upload',
        expect.objectContaining({ body: expect.any(FormData) }),
      );
      expect(result).toEqual({ url: 'https://cdn.b-cdn.net/hero/loop.mp4', path: 'hero/loop.mp4' });
    });

    it('accepts webm', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true, url: 'https://cdn.b-cdn.net/hero/loop.webm', path: 'hero/loop.webm' },
        error: null,
      });
      const file = makeFile('loop.webm', 'video/webm', 1024);
      await expect(siteImagesApi.uploadVideo(file)).resolves.toMatchObject({ url: expect.any(String) });
    });

    it('throws and does NOT invoke for a non-video MIME type', async () => {
      const file = makeFile('clip.mov', 'video/quicktime', 1024);
      await expect(siteImagesApi.uploadVideo(file)).rejects.toThrow(/invalid video type/i);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('throws and does NOT invoke when the video exceeds 15 MB', async () => {
      const file = makeFile('big.mp4', 'video/mp4', 15 * 1024 * 1024 + 1);
      await expect(siteImagesApi.uploadVideo(file)).rejects.toThrow(/15mb/i);
      expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
    });
  });
});
