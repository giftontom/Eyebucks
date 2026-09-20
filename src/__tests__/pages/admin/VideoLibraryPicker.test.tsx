import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: { listLibraryVideos: vi.fn() },
}));

vi.mock('../../../../services/api/admin.api', () => ({ adminApi: mockApi }));

import { VideoLibraryPicker } from '../../../../pages/admin/components/VideoLibraryPicker';

const videos = [
  {
    guid: 'aaaa1111-2222-3333-4444-555566667777', title: 'Intro to Editing', dateUploaded: '2026-01-01T00:00:00Z',
    status: 4, lengthSeconds: 95, thumbnailUrl: 'https://cdn/aaaa/thumbnail.jpg',
    hlsUrl: 'https://cdn/aaaa/playlist.m3u8', isPlayable: true,
  },
  {
    guid: 'bbbb1111-2222-3333-4444-555566667777', title: 'Still Transcoding', dateUploaded: '2026-01-02T00:00:00Z',
    status: 3, lengthSeconds: 0, thumbnailUrl: 'https://cdn/bbbb/thumbnail.jpg',
    hlsUrl: 'https://cdn/bbbb/playlist.m3u8', isPlayable: false,
  },
];

const libraryPage = (over: Partial<{ totalItems: number; page: number }> = {}) => ({
  success: true,
  page: over.page ?? 1,
  itemsPerPage: 24,
  totalItems: over.totalItems ?? 2,
  videos,
});

describe('VideoLibraryPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.listLibraryVideos.mockResolvedValue(libraryPage());
  });

  it('loads and renders videos with status badge for non-playable ones', async () => {
    render(<VideoLibraryPicker open onClose={vi.fn()} onSelect={vi.fn()} />);

    expect(await screen.findByText('Intro to Editing')).toBeInTheDocument();
    expect(screen.getByText('Still Transcoding')).toBeInTheDocument();
    expect(screen.getByText('Transcoding')).toBeInTheDocument(); // BUNNY_STATUS[3] badge
    expect(mockApi.listLibraryVideos).toHaveBeenCalledWith({
      page: 1, itemsPerPage: 24, search: undefined,
    });
  });

  it('does not fetch when closed', () => {
    render(<VideoLibraryPicker open={false} onClose={vi.fn()} onSelect={vi.fn()} />);
    expect(mockApi.listLibraryVideos).not.toHaveBeenCalled();
  });

  it('calls onSelect with the full video when a playable card is clicked', async () => {
    const onSelect = vi.fn();
    render(<VideoLibraryPicker open onClose={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(await screen.findByText('Intro to Editing'));
    expect(onSelect).toHaveBeenCalledWith(videos[0]);
  });

  it('does not call onSelect for a non-playable video', async () => {
    const onSelect = vi.fn();
    render(<VideoLibraryPicker open onClose={vi.fn()} onSelect={onSelect} />);

    fireEvent.click(await screen.findByText('Still Transcoding'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('refetches with the search term after the debounce', async () => {
    render(<VideoLibraryPicker open onClose={vi.fn()} onSelect={vi.fn()} />);
    await screen.findByText('Intro to Editing');

    fireEvent.change(screen.getByPlaceholderText('Search videos by title…'), {
      target: { value: 'intro' },
    });

    await waitFor(() => {
      expect(mockApi.listLibraryVideos).toHaveBeenCalledWith({
        page: 1, itemsPerPage: 24, search: 'intro',
      });
    });
  });

  it('fetches the next page when Next is clicked', async () => {
    mockApi.listLibraryVideos.mockResolvedValue(libraryPage({ totalItems: 30 }));
    render(<VideoLibraryPicker open onClose={vi.fn()} onSelect={vi.fn()} />);
    await screen.findByText('Intro to Editing');

    fireEvent.click(screen.getByLabelText('Next page'));

    await waitFor(() => {
      expect(mockApi.listLibraryVideos).toHaveBeenCalledWith({
        page: 2, itemsPerPage: 24, search: undefined,
      });
    });
  });

  it('shows an error state when loading fails', async () => {
    mockApi.listLibraryVideos.mockRejectedValue(new Error('Video service not configured'));
    render(<VideoLibraryPicker open onClose={vi.fn()} onSelect={vi.fn()} />);

    expect(await screen.findByText('Video service not configured')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });
});
