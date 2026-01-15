import React, { useState, useRef, DragEvent } from 'react';
import { Upload, X, Film, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface VideoUploaderProps {
  onUploadComplete: (videoData: {publicId: string; secureUrl: string; duration: number; thumbnail: string}) => void;
  initialVideoUrl?: string;
  disabled?: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUploadComplete,
  initialVideoUrl,
  disabled = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(initialVideoUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

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

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);

    // Upload to Cloudinary via backend
    await uploadVideo(file);
  };

  const uploadVideo = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);

          if (response.success && response.video) {
            onUploadComplete({
              publicId: response.video.publicId,
              secureUrl: response.video.secureUrl,
              duration: response.video.duration || 0,
              thumbnail: response.video.thumbnail || ''
            });
            setUploading(false);
            setUploadProgress(100);
          } else {
            throw new Error('Upload failed');
          }
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload');
      });

      xhr.open('POST', '/api/admin/videos/upload');

      // Add auth token from localStorage
      const token = localStorage.getItem('accessToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);

    } catch (err: any) {
      console.error('Video upload error:', err);
      setError(err.message || 'Failed to upload video');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeVideo = () => {
    setVideoPreview(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
            <span className="text-sm font-medium text-gray-900">
              Uploading video... {uploadProgress}%
            </span>
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
              <span className="text-sm font-medium text-gray-900">
                Video uploaded successfully
              </span>
              <CheckCircle className="w-4 h-4 text-green-500" />
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

          <video
            src={videoPreview}
            controls
            className="w-full rounded-lg max-h-64"
          />
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
