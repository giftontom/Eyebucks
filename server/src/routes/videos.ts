import { Router, Request, Response, NextFunction } from 'express';
import { cloudinaryService } from '../services/cloudinaryService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/videos/signed-url/:publicId
 * Generate a signed URL for a Cloudinary video
 *
 * This endpoint is used to generate time-limited signed URLs for secure video access
 * Prevents hotlinking and unauthorized access to videos
 */
router.get('/signed-url/:publicId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      throw new AppError('Video ID is required', 400);
    }

    // Check if Cloudinary is configured
    if (!cloudinaryService.isConfigured()) {
      // Mock mode: return placeholder URLs
      return res.json({
        signedUrl: `https://placeholder-video.com/${publicId}.mp4`,
        hlsUrl: `https://placeholder-video.com/${publicId}.m3u8`,
        expiresAt: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      });
    }

    // Generate signed URL (expires in 1 hour)
    const signedUrl = cloudinaryService.getSignedVideoUrl(publicId, 3600);

    // Generate HLS streaming URL (for adaptive bitrate streaming)
    const hlsUrl = cloudinaryService.getVideoStreamUrl(publicId, 'hls');

    // Return URLs with expiration timestamp
    res.json({
      signedUrl,
      hlsUrl,
      expiresAt: Math.floor(Date.now() / 1000) + 3600 // Unix timestamp (1 hour from now)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/videos/thumbnail/:publicId
 * Get thumbnail URL for a video
 */
router.get('/thumbnail/:publicId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.params;
    const { time = 0 } = req.query; // Time in seconds

    if (!publicId) {
      throw new AppError('Video ID is required', 400);
    }

    // Check if Cloudinary is configured
    if (!cloudinaryService.isConfigured()) {
      return res.json({
        thumbnailUrl: `https://placeholder-image.com/${publicId}.jpg`
      });
    }

    const thumbnailUrl = cloudinaryService.getVideoThumbnail(
      publicId,
      parseInt(time as string) || 0
    );

    res.json({
      thumbnailUrl
    });
  } catch (error) {
    next(error);
  }
});

export default router;
