import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockSupabase, mockTusUpload } = vi.hoisted(() => {
  const mockTusUpload = vi.fn();
  return {
    mockSupabase: {
      functions: { invoke: vi.fn() },
      auth: { refreshSession: vi.fn() },
    },
    mockTusUpload,
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
    constructor(file: File, options: any) {
      this.file = file;
      this.options = options;
      mockTusUpload(file, options);
    }
    start() {
      // Simulate progress + success on next tick
      setTimeout(() => {
        this.options.onProgress?.(50, 100);
        this.options.onProgress?.(100, 100);
        this.options.onSuccess?.();
      }, 0);
    }
    abort() {}
  },
}));

import { VideoUploader } from '../../../components/VideoUploader';

const makeFile = (name: string, sizeBytes: number, type: string): File => {
  const file = new File([new Uint8Array(Math.min(sizeBytes, 1024))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
};

describe('VideoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders the drop zone with allowed format hint', () => {
    render(<VideoUploader onUploadComplete={vi.fn()} />);
    expect(screen.getByText(/Drop video here or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4, MOV, AVI, WebM/i)).toBeInTheDocument();
  });

  it('rejects files larger than 500MB', async () => {
    const onUploadComplete = vi.fn();
    const { container } = render(<VideoUploader onUploadComplete={onUploadComplete} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const tooBig = makeFile('big.mp4', 600 * 1024 * 1024, 'video/mp4');
    fireEvent.change(input, { target: { files: [tooBig] } });

    expect(await screen.findByText(/exceeds 500MB limit/i)).toBeInTheDocument();
    expect(onUploadComplete).not.toHaveBeenCalled();
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

  it('uploads via TUS and calls onUploadComplete on success', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: {
        success: true,
        video: {
          videoId: 'vid-123',
          libraryId: 'lib-1',
          tusEndpoint: 'https://video.bunnycdn.com/tusupload',
          authSignature: 'sig',
          authExpire: 9999,
          hlsUrl: 'https://cdn.b-cdn.net/vid-123/playlist.m3u8',
          thumbnailUrl: 'https://cdn.b-cdn.net/vid-123/thumb.jpg',
        },
      },
      error: null,
    });

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
    expect(mockTusUpload).toHaveBeenCalled();
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
