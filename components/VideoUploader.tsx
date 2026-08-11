import { Upload, X, Film, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect, useImperativeHandle, DragEvent } from 'react';
import * as tus from 'tus-js-client';

import { supabase } from '../services/supabase';
import { isEdgeFnAuthError, extractEdgeFnError } from '../utils/edgeFunctionError';
import { logger } from '../utils/logger';

export interface VideoUploaderHandle {
  /** Deliberately cancel an in-flight upload: terminates the TUS upload
   *  server-side and deletes the orphaned Bunny video. */
  cancelUpload: () => Promise<void>;
}

interface VideoUploaderProps {
  onUploadComplete: (videoData: {publicId: string; secureUrl: string; duration: number; thumbnail: string}) => void;
  onRemove?: () => void;
  initialVideoUrl?: string;
  disabled?: boolean;
  /** Notified whenever an upload starts (true) or ends/succeeds/fails/cancels (false). */
  onUploadingChange?: (uploading: boolean) => void;
  /** React 19 ref-as-prop — exposes {@link VideoUploaderHandle}. */
  ref?: React.Ref<VideoUploaderHandle>;
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

const MAX_FILE_SIZE_GB = 2;
const MAX_FILE_SIZE = MAX_FILE_SIZE_GB * 1024 * 1024 * 1024; // 2 GiB (server backstop is 5 GB)
const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE_GB}GB`;
const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

// TUS upload credentials are bound to a specific Bunny video GUID (the auth
// signature = SHA256(libraryId + apiKey + expire + guid)), so resuming an
// interrupted upload requires the ORIGINAL creds — persist them keyed by file
// identity so a reload/interruption can resume against the same GUID.
const TUS_CREDS_PREFIX = 'eyebuckz:tus-creds:';
const credsKeyFor = (f: File) => `${TUS_CREDS_PREFIX}${f.name}/${f.size}/${f.lastModified}`;

// Human-readable ETA from seconds remaining.
const formatEta = (s: number): string =>
  s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`
    : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s`
      : `${s}s`;

export const VideoUploader = ({
  onUploadComplete,
  onRemove,
  initialVideoUrl,
  disabled = false,
  onUploadingChange,
  ref,
}: VideoUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(initialVideoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // Identity of the in-flight upload, for deliberate cancel / orphan cleanup.
  const activeVideoIdRef = useRef<string | null>(null);
  const activeCredsKeyRef = useRef<string | null>(null);
  // Rolling window of {timestamp, bytes} samples for ETA estimation.
  const rateSamplesRef = useRef<Array<{ t: number; bytes: number }>>([]);
  const lastEtaUpdateRef = useRef(0);

  // Notify parent (e.g. ModuleManager) so it can guard modal-close while uploading.
  useEffect(() => { onUploadingChange?.(uploading); }, [uploading, onUploadingChange]);

  // Warn on tab close / reload while an upload is in flight. If the admin
  // proceeds anyway, the persisted creds + TUS fingerprint make it resumable.
  useEffect(() => {
    if (!uploading) { return; }
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  // Cleanup object URL and PAUSE (not terminate) the TUS upload on unmount.
  // Pause-only preserves resume state after a hard navigation; deliberate
  // cancels go through cancelUpload() which terminates + cleans up.
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

  const resetRate = () => {
    rateSamplesRef.current = [];
    lastEtaUpdateRef.current = 0;
    setEtaSeconds(null);
  };

  const loadStoredCreds = (file: File): TusCredentials | null => {
    try {
      const raw = localStorage.getItem(credsKeyFor(file));
      if (!raw) { return null; }
      const creds = JSON.parse(raw) as TusCredentials;
      // Expired (or about to expire) — the GUID is now unreachable; drop the
      // stored creds and fire-and-forget delete the orphaned Bunny entry.
      if (!creds.authExpire || creds.authExpire * 1000 < Date.now() + 60_000) {
        localStorage.removeItem(credsKeyFor(file));
        if (creds.videoId) {
          supabase.functions.invoke('video-cleanup', { body: { deleteVideoId: creds.videoId } }).catch(() => {});
        }
        return null;
      }
      return creds;
    } catch { return null; }
  };

  const storeCreds = (file: File, creds: TusCredentials) => {
    try { localStorage.setItem(credsKeyFor(file), JSON.stringify(creds)); } catch { /* quota — non-fatal */ }
  };

  const clearActiveCreds = () => {
    if (activeCredsKeyRef.current) {
      try { localStorage.removeItem(activeCredsKeyRef.current); } catch { /* non-fatal */ }
      activeCredsKeyRef.current = null;
    }
    activeVideoIdRef.current = null;
  };

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
      let resolved = false;
      const done = (dur: number) => {
        if (resolved) {return;}
        resolved = true;
        URL.revokeObjectURL(url);
        resolve(dur);
      };
      video.onloadedmetadata = () => done(isFinite(video.duration) ? video.duration : 0);
      video.onerror = () => done(0);
      setTimeout(() => done(0), 5000); // fallback: don't hang if metadata never loads
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
      setError(`File size exceeds ${MAX_FILE_SIZE_LABEL} limit`);
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
    resetRate();

    try {
      // Phase 1: reuse valid persisted creds (resume) or mint fresh ones.
      let creds = loadStoredCreds(file);

      if (!creds) {
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

        creds = data.video as TusCredentials;
        storeCreds(file, creds);
      }

      activeVideoIdRef.current = creds.videoId;
      activeCredsKeyRef.current = credsKeyFor(file);

      const activeCreds = creds;

      // Phase 2: Upload file directly to Bunny via chunked, resumable TUS.
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: activeCreds.tusEndpoint,
          // 64 MiB chunks bound worst-case retransmission on a dropped
          // connection to one chunk (Infinity — the old default — could lose
          // the whole transfer). 32 PATCHes for a 2GB file.
          chunkSize: 64 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
          storeFingerprintForResuming: true,
          removeFingerprintOnSuccess: true,
          headers: {
            AuthorizationSignature: activeCreds.authSignature,
            AuthorizationExpire: String(activeCreds.authExpire),
            VideoId: activeCreds.videoId,
            LibraryId: activeCreds.libraryId,
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
            setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));

            // ETA from a 15s sliding window, throttled to ~1 Hz.
            const now = Date.now();
            const samples = rateSamplesRef.current;
            samples.push({ t: now, bytes: bytesUploaded });
            while (samples.length > 2 && now - samples[0].t > 15_000) { samples.shift(); }
            if (now - lastEtaUpdateRef.current >= 1000 && samples.length >= 2) {
              const dt = (now - samples[0].t) / 1000;
              const dBytes = bytesUploaded - samples[0].bytes;
              if (dt >= 3 && dBytes > 0) {
                setEtaSeconds(Math.round((bytesTotal - bytesUploaded) / (dBytes / dt)));
                lastEtaUpdateRef.current = now;
              }
            }
          },
          onSuccess() {
            resolve();
          },
        });

        tusUploadRef.current = upload;
        // Resume a prior interrupted transfer of this same file if one exists.
        upload.findPreviousUploads()
          .then((previous) => {
            if (previous.length > 0) { upload.resumeFromPreviousUpload(previous[0]); }
            upload.start();
          })
          .catch(() => upload.start());
      });

      setUploadProgress(100);
      setEtaSeconds(null);
      setUploadSuccess(true);

      // Upload complete — the video is now (about to be) referenced by the
      // lesson, so drop the persisted creds; a re-upload mints fresh ones.
      clearActiveCreds();

      onUploadComplete({
        publicId: activeCreds.videoId,
        secureUrl: activeCreds.hlsUrl,
        duration: fileDurationRef.current,
        thumbnail: activeCreds.thumbnailUrl,
      });

      setUploading(false);
    } catch (err: any) {
      logger.error('Video upload error:', err);
      setError(err.message || 'Failed to upload video');
      setUploadSuccess(false);
      setUploading(false);
      setUploadProgress(0);
      resetRate();
      // Keep persisted creds + TUS fingerprint on error so a retry can resume.
    } finally {
      tusUploadRef.current = null;
    }
  };

  // Deliberate cancel — the ONLY path that terminates the upload server-side
  // and deletes the orphaned Bunny video entry.
  const cancelUpload = async () => {
    const upload = tusUploadRef.current;
    const videoId = activeVideoIdRef.current;
    tusUploadRef.current = null;

    if (upload) {
      try {
        await upload.abort(true); // shouldTerminate=true → DELETE the tus upload + clear fingerprint
      } catch (e) {
        logger.error('TUS terminate failed:', e);
      }
    }

    clearActiveCreds();

    if (videoId) {
      // Fire-and-forget: delete the up-front-created Bunny video entry.
      supabase.functions.invoke('video-cleanup', { body: { deleteVideoId: videoId } })
        .catch((err) => logger.error('[VideoUploader] Orphan cleanup failed:', err));
    }

    // Reset UI (mirrors removeVideo's non-uploading reset).
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setVideoPreview(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadSuccess(false);
    setError(null);
    resetRate();
    if (fileInputRef.current) { fileInputRef.current.value = ''; }
    onRemove?.();
  };

  useImperativeHandle(ref, () => ({ cancelUpload }), []);

  const removeVideo = () => {
    // If an upload is in flight, route through the terminating cancel path.
    if (uploading) {
      void cancelUpload();
      return;
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
            ${dragActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 't-border'}
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
            <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Upload className="w-8 h-8 text-brand-600" />
            </div>

            <div>
              <p className="text-lg font-medium t-text">
                Drop video here or click to browse
              </p>
              <p className="text-sm t-text-2 mt-1">
                Supports MP4, MOV, AVI, WebM (max {MAX_FILE_SIZE_LABEL})
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Select Video
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="t-card t-border border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
              <span className="text-sm font-medium t-text">
                Uploading video... {uploadProgress}%
                {etaSeconds !== null && (
                  <span className="t-text-2"> · ~{formatEta(etaSeconds)} left</span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={cancelUpload}
              className="t-text-3 hover:text-red-600 transition-colors"
              title="Cancel upload"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full t-bg-alt rounded-full h-2">
            <div
              className="bg-brand-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <p className="text-xs t-text-2 mt-2">
            You can safely leave — an interrupted upload resumes when you return.
          </p>
        </div>
      )}

      {/* Video Preview */}
      {videoPreview && !uploading && (
        <div className="t-card t-border border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-brand-600" />
              {uploadSuccess ? (
                <>
                  <span className="text-sm font-medium t-text">
                    Video uploaded successfully
                  </span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </>
              ) : (
                <span className="text-sm font-medium t-text">
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
