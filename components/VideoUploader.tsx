import { Upload, X, Film, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect, DragEvent } from 'react';
import * as tus from 'tus-js-client';

import { supabase } from '../services/supabase';
import { isEdgeFnAuthError, extractEdgeFnError } from '../utils/edgeFunctionError';
import { logger } from '../utils/logger';

interface VideoUploaderProps {
  onUploadComplete: (videoData: {publicId: string; secureUrl: string; duration: number; thumbnail: string}) => void;
  onRemove?: () => void;
  initialVideoUrl?: string;
  disabled?: boolean;
}

interface TusCredentials {
  videoId: string;
  libraryId: string;
  tusEndpoint: string;
  authSignature: string;
  authExpire: number;
  hlsUrl: string;
  thumbnailUrl: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUploadComplete,
  onRemove,
  initialVideoUrl,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(initialVideoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

  // Cleanup object URL and abort TUS upload on unmount
  useEffect(() => {
    return () => {
      if (tusUploadRef.current) {
        tusUploadRef.current.abort();
        tusUploadRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Extract duration from a local video file before uploading
  const extractDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const dur = video.duration;
        URL.revokeObjectURL(url);
        resolve(isFinite(dur) ? dur : 0);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
    });
  };

  // Store extracted duration for use after upload
  const fileDurationRef = useRef<number>(0);

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file type
    if (!ALLOWED_FORMATS.includes(file.type)) {
      setError('Invalid file format. Please upload MP4, MOV, AVI, or WebM');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 500MB limit');
      return;
    }

    // Revoke previous object URL if any
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    // Extract duration from local file before upload
    fileDurationRef.current = await extractDuration(file);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setVideoPreview(previewUrl);

    // Upload to Bunny Stream via TUS
    await uploadVideo(file);
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Phase 1: Get TUS credentials from Edge Function
      let { data, error: fnError } = await supabase.functions.invoke('admin-video-upload', {
        body: { title: file.name, fileSizeBytes: file.size, mimeType: file.type },
      });

      if (fnError) {
        // If JWT expired, refresh session and retry once
        if (isEdgeFnAuthError(fnError)) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            throw new Error('Your session has expired. Please log in again.');
          }
          const retry = await supabase.functions.invoke('admin-video-upload', {
            body: { title: file.name, fileSizeBytes: file.size, mimeType: file.type },
          });
          data = retry.data;
          if (retry.error) {
            throw new Error(await extractEdgeFnError(retry.error, retry.error.message));
          }
        } else {
          throw new Error(await extractEdgeFnError(fnError, fnError.message));
        }
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Upload failed');
      }

      const creds: TusCredentials = data.video;

      // Phase 2: Upload file directly to Bunny via TUS protocol
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: creds.tusEndpoint,
          retryDelays: [0, 1000, 3000, 5000],
          headers: {
            AuthorizationSignature: creds.authSignature,
            AuthorizationExpire: String(creds.authExpire),
            VideoId: creds.videoId,
            LibraryId: creds.libraryId,
          },
          metadata: {
            filetype: file.type,
            title: file.name,
          },
          onError(err) {
            logger.error('TUS upload error:', err);
            reject(new Error(err.message || 'Video upload failed'));
          },
          onProgress(bytesUploaded, bytesTotal) {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setUploadProgress(pct);
          },
          onSuccess() {
            resolve();
          },
        });

        tusUploadRef.current = upload;
        upload.start();
      });

      setUploadProgress(100);
      setUploadSuccess(true);

      onUploadComplete({
        publicId: creds.videoId,
        secureUrl: creds.hlsUrl,
        duration: fileDurationRef.current,
        thumbnail: creds.thumbnailUrl,
      });

      setUploading(false);
    } catch (err: any) {
      logger.error('Video upload error:', err);
      setError(err.message || 'Failed to upload video');
      setUploadSuccess(false);
      setUploading(false);
      setUploadProgress(0);
    } finally {
      tusUploadRef.current = null;
    }
  };

  const removeVideo = () => {
    // Abort in-progress TUS upload if any
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    // Revoke object URL to prevent memory leak
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setVideoPreview(null);
    setError(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Notify parent to clear video data
    onRemove?.();
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!videoPreview && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-brand-400 cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
            onChange={handleFileInput}
            disabled={disabled}
          />

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-brand-600" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop video here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports MP4, MOV, AVI, WebM (max 500MB)
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              disabled={disabled}
            >
              Select Video
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
              <span className="text-sm font-medium text-gray-900">
                Uploading video... {uploadProgress}%
              </span>
            </div>

            <button
              type="button"
              onClick={removeVideo}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Cancel upload"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Please don't close this window while uploading
          </p>
        </div>
      )}

      {/* Video Preview */}
      {videoPreview && !uploading && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-brand-600" />
              {uploadSuccess ? (
                <>
                  <span className="text-sm font-medium text-gray-900">
                    Video uploaded successfully
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </>
              ) : (
                <span className="text-sm font-medium text-gray-900">
                  Selected video
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={removeVideo}
              className="text-gray-400 hover:text-red-600 transition-colors"
              disabled={disabled}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {videoPreview.includes('.m3u8') ? (
            <div className="w-full rounded-lg bg-slate-100 p-4 flex items-center gap-3">
              <Film className="w-8 h-8 text-brand-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">Existing HLS video</p>
                <p className="text-xs text-slate-400 truncate max-w-md">{videoPreview}</p>
              </div>
            </div>
          ) : (
            <video
              src={videoPreview}
              controls
              className="w-full rounded-lg max-h-64"
            />
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Upload failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
