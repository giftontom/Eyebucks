import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase, mockTusUpload, mockTusState } = vi.hoisted(() => {
  const mockTusUpload = vi.fn();
  // Controls whether the fake TUS upload auto-completes; the cancel test sets
  // autoSucceed=false to keep an upload "in flight".
  const mockTusState = { autoSucceed: true };
  return {
    mockSupabase: {
      functions: { invoke: vi.fn() },
      auth: { refreshSession: vi.fn() },
    },
    mockTusUpload,
    mockTusState,
  };
});

vi.mock('../../../services/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../../utils/edgeFunctionError', () => ({
  isEdgeFnAuthError: () => false,
  extractEdgeFnError: (_e: unknown, msg: string) => Promise.resolve(msg),
}));

vi.mock('tus-js-client', () => ({
  Upload: class {
    file: File;
    options: any;
    aborted: boolean | null = null;
    constructor(file: File, options: any) {
      this.file = file;
      this.options = options;
      mockTusUpload(file, options);
    }
    findPreviousUploads() { return Promise.resolve([]); }
    resumeFromPreviousUpload() {}
    start() {
      // Simulate progress; only fire success when autoSucceed is set.
      setTimeout(() => {
        this.options.onProgress?.(50, 100);
        if (mockTusState.autoSucceed) {
          this.options.onProgress?.(100, 100);
          this.options.onSuccess?.();
        }
      }, 0);
    }
    abort(shouldTerminate?: boolean) {
      this.aborted = shouldTerminate ?? false;
      return Promise.resolve();
    }
  },
}));

import { VideoUploader, type VideoUploaderHandle } from '../../../components/VideoUploader';

const CREDS_RESPONSE = {
  data: {
    success: true,
    video: {
      videoId: 'vid-123',
      libraryId: 'lib-1',
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
      authSignature: 'sig',
      authExpire: 9999999999,
      hlsUrl: 'https://cdn.b-cdn.net/vid-123/playlist.m3u8',
      thumbnailUrl: 'https://cdn.b-cdn.net/vid-123/thumb.jpg',
    },
  },
  error: null,
};

// Route invoke() by function name: creds for admin-video-upload, ok for cleanup.
const routeInvoke = (name: string) =>
  name === 'video-cleanup'
    ? Promise.resolve({ data: { success: true }, error: null })
    : Promise.resolve(CREDS_RESPONSE);

const makeFile = (name: string, sizeBytes: number, type: string): File => {
  const file = new File([new Uint8Array(Math.min(sizeBytes, 1024))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

describe('VideoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTusState.autoSucceed = true;
    try { localStorage.clear(); } catch { /* no-op */ }
    mockSupabase.functions.invoke.mockImplementation((name: string) => routeInvoke(name));
    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();
    // jsdom doesn't load video metadata; fire onloadedmetadata as soon as src is set
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
      configurable: true,
      set(value: string) {
        this.setAttribute('src', value);
        Object.defineProperty(this, 'duration', { configurable: true, value: 42 });
        queueMicrotask(() => this.onloadedmetadata?.(new Event('loadedmetadata')));
      },
      get() {
        return this.getAttribute('src') || '';
      },
    });
  });

  it('renders the drop zone with allowed format hint and 2GB cap', () => {
    render(<VideoUploader onUploadComplete={vi.fn()} />);
    expect(screen.getByText(/Drop video here or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4, MOV, AVI, WebM/i)).toBeInTheDocument();
    expect(screen.getByText(/max 2GB/i)).toBeInTheDocument();
  });

  it('rejects files larger than 2GB', async () => {
    const onUploadComplete = vi.fn();
    const { container } = render(<VideoUploader onUploadComplete={onUploadComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const tooBig = makeFile('big.mp4', 3 * 1024 * 1024 * 1024, 'video/mp4'); // 3 GB
    fireEvent.change(input, { target: { files: [tooBig] } });

    expect(await screen.findByText(/exceeds 2GB limit/i)).toBeInTheDocument();
    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it('accepts a large file under the 2GB cap (no size rejection)', async () => {
    const onUploadComplete = vi.fn();
    const { container } = render(<VideoUploader onUploadComplete={onUploadComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const bigButOk = makeFile('lecture.mp4', 1.5 * 1024 * 1024 * 1024, 'video/mp4'); // 1.5 GB
    fireEvent.change(input, { target: { files: [bigButOk] } });

    await waitFor(() => expect(onUploadComplete).toHaveBeenCalled());
    expect(screen.queryByText(/exceeds/i)).not.toBeInTheDocument();
  });

  it('rejects files with disallowed mime type', async () => {
    const onUploadComplete = vi.fn();
    const { container } = render(<VideoUploader onUploadComplete={onUploadComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const badFormat = makeFile('image.png', 1024, 'image/png');
    fireEvent.change(input, { target: { files: [badFormat] } });

    expect(await screen.findByText(/Invalid file format/i)).toBeInTheDocument();
    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it('uploads via chunked TUS and calls onUploadComplete on success', async () => {
    const onUploadComplete = vi.fn();
    const { container } = render(<VideoUploader onUploadComplete={onUploadComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const goodFile = makeFile('lecture.mp4', 5 * 1024 * 1024, 'video/mp4');
    fireEvent.change(input, { target: { files: [goodFile] } });

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith({
        publicId: 'vid-123',
        secureUrl: 'https://cdn.b-cdn.net/vid-123/playlist.m3u8',
        duration: expect.any(Number),
        thumbnail: 'https://cdn.b-cdn.net/vid-123/thumb.jpg',
      });
    });
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      'admin-video-upload',
      expect.objectContaining({
        body: expect.objectContaining({ title: 'lecture.mp4', mimeType: 'video/mp4' }),
      })
    );
    // Chunked + resumable options are passed to the TUS upload.
    expect(mockTusUpload).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ chunkSize: 64 * 1024 * 1024, removeFingerprintOnSuccess: true }),
    );
  });

  it('notifies onUploadingChange true then false across a successful upload', async () => {
    const onUploadingChange = vi.fn();
    const { container } = render(
      <VideoUploader onUploadComplete={vi.fn()} onUploadingChange={onUploadingChange} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('lecture.mp4', 5 * 1024 * 1024, 'video/mp4')] } });

    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(true));
    await waitFor(() => expect(onUploadingChange).toHaveBeenLastCalledWith(false));
  });

  it('cancelUpload() terminates the upload and deletes the orphaned Bunny video', async () => {
    mockTusState.autoSucceed = false; // keep the upload in flight
    const ref = React.createRef<VideoUploaderHandle>();
    const { container } = render(<VideoUploader ref={ref} onUploadComplete={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('lecture.mp4', 5 * 1024 * 1024, 'video/mp4')] } });

    // Wait for the in-flight state (progress UI visible).
    expect(await screen.findByText(/Uploading video/i)).toBeInTheDocument();

    await ref.current!.cancelUpload();

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      'video-cleanup',
      expect.objectContaining({ body: { deleteVideoId: 'vid-123' } }),
    );
  });

  it('surfaces Edge Function errors to the user', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Quota exceeded' },
    });

    const onUploadComplete = vi.fn();
    const { container } = render(<VideoUploader onUploadComplete={onUploadComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [makeFile('lecture.mp4', 5 * 1024 * 1024, 'video/mp4')] },
    });

    expect(await screen.findByText(/Quota exceeded/i)).toBeInTheDocument();
    expect(onUploadComplete).not.toHaveBeenCalled();
  });
});
