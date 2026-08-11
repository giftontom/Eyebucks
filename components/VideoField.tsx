import { Upload, X, Loader2, AlertCircle, Film } from 'lucide-react';
import React, { useState, useRef, type DragEvent } from 'react';

import { siteImagesApi, type ImageFolder } from '../services/api/siteImages.api';
import { logger } from '../utils/logger';

export interface VideoFieldProps {
  /** Current video URL (controlled). */
  value?: string;
  /** Called with the new public CDN URL after upload, a pasted URL, or '' on remove. */
  onChange: (url: string) => void;
  /** Bunny storage folder the video lands in. */
  folder: ImageFolder;
  label?: string;
  disabled?: boolean;
}

const isHttpUrl = (s: string) => {
  try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
};

// A media URL the storefront CSP (media-src https://*.b-cdn.net) will actually
// play. Also identifies assets we own (safe to delete on replace/remove).
const isBunnyUrl = (s?: string) => {
  if (!s) { return false; }
  try { return new URL(s).host.endsWith('.b-cdn.net'); }
  catch { return false; }
};

/**
 * Reusable admin video picker for short marketing loops (hero/banner slides).
 * Upload a small mp4/webm to Bunny Storage (served anonymously — no signing) via
 * siteImagesApi, OR paste an existing direct video URL. Emits the resulting URL
 * through onChange. Mirrors the {@link ImageUpload} UX.
 */
export const VideoField: React.FC<VideoFieldProps> = ({
  value,
  onChange,
  folder,
  label = 'Video',
  disabled,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevUrlRef = useRef<string | undefined>(value);

  const pick = () => { if (!disabled && !uploading) { inputRef.current?.click(); } };

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { url } = await siteImagesApi.uploadVideo(file, folder);
      // Best-effort clean up the previous video we owned — only if it was a
      // Bunny Storage asset we uploaded (verified by host), never a pasted URL.
      if (prevUrlRef.current && prevUrlRef.current !== url && isBunnyUrl(prevUrlRef.current)) {
        void siteImagesApi.deleteImage(prevUrlRef.current);
      }
      prevUrlRef.current = url;
      onChange(url);
    } catch (err) {
      logger.error('[VideoField]', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) { inputRef.current.value = ''; }
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { void handleFile(e.target.files[0]); }
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled || uploading) { return; }
    if (e.dataTransfer.files?.[0]) { void handleFile(e.dataTransfer.files[0]); }
  };
  const onDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const remove = () => {
    if (isBunnyUrl(value)) { void siteImagesApi.deleteImage(value!); }
    prevUrlRef.current = undefined;
    onChange('');
  };
  const applyUrl = () => {
    const u = urlDraft.trim();
    if (!u) { return; }
    if (!isHttpUrl(u)) { setError('Enter a valid http(s) video URL.'); return; }
    // The storefront CSP only allows media from *.b-cdn.net, so a non-Bunny URL
    // would silently fail to play. Reject it here instead of saving a dead link.
    if (!isBunnyUrl(u)) { setError('Paste a Bunny CDN (b-cdn.net) URL, or upload a file.'); return; }
    setError(null);
    prevUrlRef.current = u;
    onChange(u);
    setUrlDraft('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium t-text-2">{label}</label>

      {value && !uploading ? (
        <div className="relative group w-full max-w-[240px] aspect-video rounded-lg overflow-hidden t-bg-alt border t-border">
          <video
            src={value}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            controls
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onClick={pick}
              disabled={disabled}
              className="px-2 py-1 text-xs rounded bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={disabled}
              aria-label="Remove video"
              className="p-1 rounded bg-black/60 text-white hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            onClick={pick}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
            className={`relative border-2 border-dashed rounded-lg w-full max-w-[240px] aspect-video flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
              dragActive ? 'border-brand-500 bg-brand-500/5' : 't-border hover:border-brand-400'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                <span className="text-sm t-text-2">Uploading…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4">
                <Film className="w-7 h-7 text-brand-600" />
                <p className="text-sm font-medium t-text">Drop video or click to upload</p>
                <p className="text-xs t-text-3">MP4, WebM · max 15MB · muted loop</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 max-w-[420px]">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
              placeholder="…or paste a Bunny CDN (b-cdn.net) URL"
              disabled={disabled || uploading}
              className="flex-1 t-input-bg t-border border rounded-lg px-3 py-1.5 text-sm t-text outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={applyUrl}
              disabled={disabled || uploading || !urlDraft.trim()}
              className="px-3 py-1.5 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              Use
            </button>
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="video/mp4,video/webm"
        onChange={onInput}
        disabled={disabled}
      />

      {error && (
        <p className="text-xs t-status-danger flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};
