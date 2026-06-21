import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import React, { useState, useRef, type DragEvent } from 'react';

import { siteImagesApi, type ImageFolder } from '../services/api/siteImages.api';
import { logger } from '../utils/logger';

export interface ImageUploadProps {
  /** Current image URL (controlled). */
  value?: string;
  /** Called with the new public CDN URL after a successful upload, or '' on remove. */
  onChange: (url: string) => void;
  /** Bunny storage folder the image lands in. */
  folder: ImageFolder;
  label?: string;
  /** Tailwind aspect-ratio class for the preview box, e.g. 'aspect-video' | 'aspect-square'. */
  aspect?: string;
  disabled?: boolean;
}

/**
 * Reusable admin image picker: drag/drop or click, instant local preview, upload
 * progress, replace and remove. Uploads via siteImagesApi (Bunny Storage proxy)
 * and emits the resulting public CDN URL through onChange. Cleans up the previous
 * image best-effort when replaced/removed.
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  folder,
  label = 'Image',
  aspect = 'aspect-video',
  disabled,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevUrlRef = useRef<string | undefined>(value);

  const pick = () => {
    if (!disabled && !uploading) { inputRef.current?.click(); }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { url } = await siteImagesApi.uploadImage(file, folder);
      // Best-effort clean up the previous image we owned.
      if (prevUrlRef.current && prevUrlRef.current !== url) {
        void siteImagesApi.deleteImage(prevUrlRef.current);
      }
      prevUrlRef.current = url;
      onChange(url);
    } catch (err) {
      logger.error('[ImageUpload]', err);
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
    if (value) { void siteImagesApi.deleteImage(value); }
    prevUrlRef.current = undefined;
    onChange('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium t-text-2">{label}</label>

      {value && !uploading ? (
        <div className="relative group">
          <div className={`w-full ${aspect} rounded-lg overflow-hidden t-bg-alt border t-border`}>
            <img src={value} alt={label} className="w-full h-full object-cover" />
          </div>
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
              aria-label="Remove image"
              className="p-1 rounded bg-black/60 text-white hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={pick}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
          className={`relative border-2 border-dashed rounded-lg ${aspect} flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
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
              <Upload className="w-7 h-7 text-brand-600" />
              <p className="text-sm font-medium t-text">Drop image or click to upload</p>
              <p className="text-xs t-text-3">JPEG, PNG, WebP, AVIF · max 5MB</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/avif"
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
