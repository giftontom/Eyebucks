import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('[Cloudinary] Configured successfully');
} else {
  console.log('[Cloudinary] Not configured - missing environment variables');
}

interface VideoUploadOptions {
  file: string; // Local file path or URL
  folder?: string;
  publicId?: string;
}

interface SignedUrlOptions {
  expiresIn?: number; // Expiry time in seconds (default: 1 hour)
}

/**
 * Cloudinary Video CDN Service
 * Handles video uploads, transformations, and secure signed URLs
 */
export const cloudinaryService = {
  /**
   * Check if Cloudinary is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  },

  /**
   * Upload a video to Cloudinary
   * @param options Upload options
   * @returns Cloudinary upload response with secure_url and public_id
   */
  async uploadVideo(options: VideoUploadOptions): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    const { file, folder = 'eyebuckz/videos', publicId } = options;

    try {
      const result = await cloudinary.uploader.upload(file, {
        resource_type: 'video',
        folder,
        public_id: publicId,
        overwrite: false,
        // Video-specific options
        eager: [
          { streaming_profile: 'hd', format: 'm3u8' }, // HLS for adaptive streaming
          { format: 'mp4', transformation: { quality: 'auto' } }
        ],
        eager_async: true,
        chunk_size: 6000000 // 6MB chunks for large video uploads
      });

      console.log('[Cloudinary] Video uploaded:', result.public_id);

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        url: result.url,
        format: result.format,
        duration: result.duration,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('[Cloudinary] Upload failed:', error);
      throw error;
    }
  },

  /**
   * Generate a signed URL for secure video streaming
   * This prevents unauthorized access and hotlinking
   *
   * @param publicId Cloudinary public_id of the video
   * @param options Signed URL options (expiry, transformations)
   * @returns Signed secure URL
   */
  getSignedVideoUrl(publicId: string, options: SignedUrlOptions = {}): string {
    if (!this.isConfigured()) {
      // In development without Cloudinary, return placeholder
      console.log('[Cloudinary] Returning placeholder URL for:', publicId);
      return `https://placeholder-video.com/${publicId}`;
    }

    const { expiresIn = 3600 } = options; // Default: 1 hour

    // Calculate expiration timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    try {
      // Generate signed URL with expiry
      const signedUrl = cloudinary.url(publicId, {
        resource_type: 'video',
        type: 'authenticated',
        sign_url: true,
        expires_at: expiresAt,
        secure: true,
        // Video transformations
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      });

      return signedUrl;
    } catch (error) {
      console.error('[Cloudinary] Failed to generate signed URL:', error);
      throw error;
    }
  },

  /**
   * Get HLS streaming URL for adaptive bitrate streaming
   * @param publicId Cloudinary public_id of the video
   * @returns HLS manifest URL (.m3u8)
   */
  getStreamingUrl(publicId: string): string {
    if (!this.isConfigured()) {
      console.log('[Cloudinary] Returning placeholder streaming URL for:', publicId);
      return `https://placeholder-video.com/${publicId}.m3u8`;
    }

    try {
      const streamingUrl = cloudinary.url(publicId, {
        resource_type: 'video',
        streaming_profile: 'hd',
        format: 'm3u8',
        secure: true
      });

      return streamingUrl;
    } catch (error) {
      console.error('[Cloudinary] Failed to generate streaming URL:', error);
      throw error;
    }
  },

  /**
   * Get thumbnail image from video
   * @param publicId Cloudinary public_id of the video
   * @param timeOffset Time offset in seconds for thumbnail (default: 0)
   * @returns Thumbnail image URL
   */
  getVideoThumbnail(publicId: string, timeOffset: number = 0): string {
    if (!this.isConfigured()) {
      return `https://placeholder-image.com/${publicId}.jpg`;
    }

    try {
      const thumbnailUrl = cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        start_offset: `${timeOffset}s`,
        transformation: [
          { width: 640, height: 360, crop: 'fill', quality: 'auto' }
        ],
        secure: true
      });

      return thumbnailUrl;
    } catch (error) {
      console.error('[Cloudinary] Failed to generate thumbnail:', error);
      throw error;
    }
  },

  /**
   * Delete a video from Cloudinary
   * @param publicId Cloudinary public_id of the video
   * @returns Deletion result
   */
  async deleteVideo(publicId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
        invalidate: true // Invalidate CDN cache
      });

      console.log('[Cloudinary] Video deleted:', publicId);
      return result;
    } catch (error) {
      console.error('[Cloudinary] Deletion failed:', error);
      throw error;
    }
  },

  /**
   * Get video details and metadata
   * @param publicId Cloudinary public_id of the video
   * @returns Video resource details
   */
  async getVideoDetails(publicId: string): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Cloudinary is not configured');
    }

    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'video'
      });

      return {
        publicId: result.public_id,
        format: result.format,
        duration: result.duration,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        url: result.url,
        secureUrl: result.secure_url,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('[Cloudinary] Failed to get video details:', error);
      throw error;
    }
  }
};
