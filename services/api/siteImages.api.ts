/**
 * Site Images API — uploads CMS/marketing images to Bunny Storage via the
 * admin-gated `admin-image-upload` Edge Function (which holds the Bunny storage
 * key server-side) and returns the public Pull-Zone CDN URL.
 *
 * Used by the <ImageUpload> component for testimonial avatars, showcase images,
 * instructor photos, banner/hero images, and course thumbnails.
 */
import { supabase } from '../supabase';
import { logger } from '../../utils/logger';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * supabase-js wraps non-2xx function responses in a FunctionsHttpError whose
 * `.message` is just "Edge Function returned a non-2xx status code". The real
 * reason (e.g. "Image service not configured") is in the response body — dig it out.
 */
async function extractFnError(error: unknown): Promise<string> {
  const fallback = (error as { message?: string })?.message || 'Image upload failed';
  const ctx = (error as { context?: unknown })?.context;
  if (ctx && typeof (ctx as Response).clone === 'function') {
    try {
      const body = await (ctx as Response).clone().json();
      if (body?.error) { return String(body.error); }
    } catch {
      /* body wasn't JSON — fall through */
    }
  }
  return fallback;
}

export type ImageFolder =
  | 'testimonials'
  | 'showcase'
  | 'creators'
  | 'instructors'
  | 'banner'
  | 'hero'
  | 'courses'
  | 'misc';

export interface UploadedImage {
  url: string;
  path: string;
}

export const siteImagesApi = {
  /** Validate client-side, then proxy-upload to Bunny via the Edge Function. */
  async uploadImage(file: File, folder: ImageFolder = 'misc'): Promise<UploadedImage> {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid image type. Use JPEG, PNG, WebP, or AVIF.');
    }
    if (file.size > MAX_SIZE) {
      throw new Error('Image exceeds the 5MB limit.');
    }

    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);

    const { data, error } = await supabase.functions.invoke('admin-image-upload', { body: form });
    if (error) {
      logger.error('[siteImages] upload failed:', error);
      throw new Error(await extractFnError(error));
    }
    if (!data?.success || !data?.url) {
      throw new Error(data?.error || 'Image upload failed');
    }
    return { url: data.url as string, path: data.path as string };
  },

  /** Best-effort delete (on replace/remove). Never throws into the caller's save path. */
  async deleteImage(pathOrUrl: string): Promise<void> {
    const path = siteImagesApi.pathFromUrl(pathOrUrl) ?? pathOrUrl;
    try {
      await supabase.functions.invoke('admin-image-upload', { body: { action: 'delete', path } });
    } catch (e) {
      logger.warn('[siteImages] delete failed (ignored):', e);
    }
  },

  /** Extract the storage path ("folder/uuid.ext") from a full CDN URL, or null. */
  pathFromUrl(url: string): string | null {
    try {
      return new URL(url).pathname.replace(/^\/+/, '');
    } catch {
      return null;
    }
  },
};
