import { Upload, X, FileArchive, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import React, { useState, useRef, type DragEvent } from 'react';

import { supabase } from '../services/supabase';
import { isEdgeFnAuthError, extractEdgeFnError } from '../utils/edgeFunctionError';
import { logger } from '../utils/logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB (R2 single-PUT limit)

export interface UploadedAsset {
  /** Storage path (R2 object key) — saved as digital_assets.storage_path. */
  path: string;
  fileExt: string;
  fileSize: number;
  filename: string;
}

interface AssetUploaderProps {
  /** Current uploaded file (controlled — set when editing an existing asset).
   *  `path` is server-only, so on edit we only have ext/size to show a file exists. */
  value?: { path?: string; fileExt: string; fileSize: number } | null;
  onUploadComplete: (data: UploadedAsset) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) { return '0 B'; }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** PUT a file to a presigned URL with upload progress (fetch has no progress events). */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) { onProgress(Math.round((e.loaded / e.total) * 100)); }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); }
      else { reject(new Error(`Upload failed (${xhr.status})`)); }
    };
    xhr.onerror = () => reject(new Error('Upload failed — check your connection'));
    xhr.send(file);
  });
}

/**
 * Admin asset file picker. Requests a presigned PUT URL from the `admin-asset-upload`
 * Edge Function, then uploads the file DIRECTLY to Cloudflare R2 (any size up to 5GB)
 * — no storage key on the client, no Edge body limit. Emits the resulting R2 path.
 */
export const AssetUploader: React.FC<AssetUploaderProps> = ({
  value,
  onUploadComplete,
  onRemove,
  disabled = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedAsset | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const requestUploadUrl = async (filename: string) => {
    let { data, error: fnError } = await supabase.functions.invoke('admin-asset-upload', {
      body: { filename },
    });
    // Refresh the session once and retry on an expired JWT (mirrors VideoUploader).
    if (fnError && isEdgeFnAuthError(fnError)) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) { throw new Error('Your session has expired. Please log in again.'); }
      const retry = await supabase.functions.invoke('admin-asset-upload', { body: { filename } });
      data = retry.data;
      fnError = retry.error;
    }
    if (fnError) { throw new Error(await extractEdgeFnError(fnError, fnError.message)); }
    if (!data?.success || !data?.uploadUrl) { throw new Error(data?.error || 'Could not start upload'); }
    return data as { path: string; uploadUrl: string; fileExt: string };
  };

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE) {
      setError('File exceeds the 5GB limit.');
      return;
    }
    setUploading(true);
    setSuccess(false);
    setProgress(0);
    try {
      const { path, uploadUrl, fileExt } = await requestUploadUrl(file.name);
      await putWithProgress(uploadUrl, file, setProgress);
      const result: UploadedAsset = { path, fileExt, fileSize: file.size, filename: file.name };
      setUploaded(result);
      setSuccess(true);
      onUploadComplete(result);
    } catch (err) {
      logger.error('[AssetUploader]', err);
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
    setUploaded(null);
    setSuccess(false);
    setError(null);
    onRemove?.();
  };

  // What to show in the "current file" summary: a freshly uploaded file, or the
  // existing file when editing.
  const current = uploaded ?? (value ? { ...value, filename: `current.${value.fileExt}` } : null);

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium t-text-2">Asset File</span>

      {current && !uploading ? (
        <div className="t-card t-border border rounded-lg p-4 flex items-start justify-between gap-3 max-w-md">
          <div className="flex items-center gap-3 min-w-0">
            <FileArchive className="w-5 h-5 text-brand-600 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium t-text truncate">
                  {success ? current.filename : `Uploaded file (.${current.fileExt})`}
                </span>
                {success && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
              </div>
              <p className="text-xs t-text-3">{formatBytes(current.fileSize)} · .{current.fileExt}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={disabled}
            aria-label="Remove file"
            className="p-1 rounded t-text-3 hover:text-red-600 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
          className={`relative border-2 border-dashed rounded-lg w-full max-w-md p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
            dragActive ? 'border-brand-500 bg-brand-500/5' : 't-border hover:border-brand-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 w-full px-4">
              <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
              <span className="text-sm t-text-2">Uploading… {progress}% — do not close this window</span>
              <div className="w-full t-bg-alt rounded-full h-2 overflow-hidden">
                <div className="bg-brand-600 h-2 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-7 h-7 text-brand-600" />
              <p className="text-sm font-medium t-text">Drop file or click to upload</p>
              <p className="text-xs t-text-3">ZIP, LUT/cube, presets, audio, PDF, project files · max 5GB</p>
            </div>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" className="hidden" onChange={onInput} disabled={disabled} />

      {error && (
        <p className="text-xs t-status-danger flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};
