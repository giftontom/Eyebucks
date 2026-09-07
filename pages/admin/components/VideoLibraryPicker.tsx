import { Search, Loader2, AlertCircle, Film, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { adminApi, type LibraryVideo } from '../../../services/api/admin.api';
import { logger } from '../../../utils/logger';

import { AdminModal } from './AdminModal';
import { BUNNY_STATUS } from './VideoCleanup';

const ITEMS_PER_PAGE = 24;
const SEARCH_DEBOUNCE_MS = 300;

function formatDuration(lengthSeconds: number): string {
  const minutes = Math.floor(lengthSeconds / 60);
  const seconds = Math.floor(lengthSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface VideoLibraryPickerProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen (playable) video; the caller closes the picker. */
  onSelect: (video: LibraryVideo) => void;
  /** Must sit above whatever opened it (lesson modal is z-[60]). */
  zIndex?: string;
}

/**
 * Modal browser for the Bunny Stream library so admins can attach an
 * already-uploaded video to a lesson or course trailer instead of
 * re-uploading. Paginated, searchable; only fully-transcoded videos are
 * selectable.
 */
export const VideoLibraryPicker: React.FC<VideoLibraryPickerProps> = ({
  open,
  onClose,
  onSelect,
  zIndex = 'z-[70]',
}) => {
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) { return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminApi.listLibraryVideos({
          page,
          itemsPerPage: ITEMS_PER_PAGE,
          search: debouncedSearch || undefined,
        });
        if (cancelled) { return; }
        setVideos(res.videos);
        setTotalItems(res.totalItems);
      } catch (err) {
        logger.error('[VideoLibraryPicker]', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load videos');
        }
      } finally {
        if (!cancelled) { setLoading(false); }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [open, page, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Video Library"
      maxWidth="max-w-2xl"
      zIndex={zIndex}
    >
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 t-text-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos by title…"
            className="w-full t-input-bg t-border border rounded-lg pl-9 pr-3 py-2 text-sm t-text placeholder:t-text-3 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm t-status-danger inline-flex items-center gap-1.5">
              <AlertCircle size={14} /> {error}
            </p>
            <div>
              <button
                type="button"
                onClick={() => { setError(null); setPage(1); setDebouncedSearch(search.trim()); }}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="py-14 flex items-center justify-center gap-2 t-text-2 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> Loading videos…
          </div>
        ) : videos.length === 0 ? (
          <p className="py-14 text-center text-sm t-text-3">
            {debouncedSearch ? `No videos match "${debouncedSearch}"` : 'No videos in the library yet'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto pr-1">
            {videos.map((video) => (
              <button
                key={video.guid}
                type="button"
                onClick={() => { if (video.isPlayable) { onSelect(video); } }}
                disabled={!video.isPlayable}
                title={video.isPlayable ? video.title : `${video.title} — ${BUNNY_STATUS[video.status] || 'Not ready'}`}
                className={`text-left rounded-lg t-border border overflow-hidden transition group ${
                  video.isPlayable
                    ? 'hover:border-brand-500 hover:shadow-md cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="aspect-video t-bg-alt relative">
                  {brokenThumbs.has(video.guid) ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-6 h-6 t-text-3" />
                    </div>
                  ) : (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={() => setBrokenThumbs((prev) => new Set(prev).add(video.guid))}
                    />
                  )}
                  {video.lengthSeconds > 0 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                      {formatDuration(video.lengthSeconds)}
                    </span>
                  )}
                  {!video.isPlayable && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded t-status-warning border text-[10px] font-medium">
                      {BUNNY_STATUS[video.status] || 'Not ready'}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium t-text truncate">{video.title}</p>
                  <p className="text-[10px] t-text-3 mt-0.5">
                    {video.dateUploaded ? new Date(video.dateUploaded).toLocaleDateString() : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t t-border">
          <p className="text-xs t-text-3">
            {totalItems} video{totalItems === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              aria-label="Previous page"
              className="p-1.5 rounded-lg t-border border t-text-2 hover:t-text disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs t-text-2">Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-lg t-border border t-text-2 hover:t-text disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </AdminModal>
  );
};
