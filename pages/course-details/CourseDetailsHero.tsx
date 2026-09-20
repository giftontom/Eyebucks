import { Star, Volume2, VolumeX } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import { Badge, WishlistButton } from '../../components';
import { useHlsAttach } from '../../hooks/useHlsAttach';

import type { Course } from '../../types';

interface Props {
  course: Course;
  /** Signed HLS trailer URL (published course hero video), or null when there
   *  is no trailer — the poster image is shown instead. */
  heroVideoSrc: string | null;
  isMuted: boolean;
  onToggleMute: () => void;
}

const HERO_POSTER_FALLBACK = 'https://images.unsplash.com/photo-1478720568477-152d9b164e63?auto=format&fit=crop&q=80&w=1920';

export const CourseDetailsHero: React.FC<Props> = ({ course, heroVideoSrc, isMuted, onToggleMute }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Lazily attach hls.js for the signed .m3u8 trailer (Chrome/Firefox);
  // Safari plays it natively. No src → the poster shows.
  useHlsAttach(videoRef, heroVideoSrc);

  // React sets `muted` as a DOM *property*, never as the HTML *attribute*.
  // iOS Safari / Android Chrome gate autoplay on the attribute being present
  // at load time, so without this the trailer silently never starts on mobile
  // and the visitor only ever sees the poster. Mirror the attribute to match
  // the property whenever the mute state changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) { return; }
    video.muted = isMuted;
    if (isMuted) {
      video.setAttribute('muted', '');
    } else {
      video.removeAttribute('muted');
    }
  }, [isMuted]);

  return (
  /* Phones and tablets get a true 16:9 box so the 16:9 poster/trailer is shown
     whole — the old fixed vh height cropped ~35% off the sides at 390px and
     ~30% at 768px. Only at lg+ is the viewport wide enough for the cinematic
     60vh letterbox to trim acceptably, so that's where it kicks in. */
  <div className="relative aspect-video lg:aspect-auto lg:h-[60vh] bg-black group">
    <video
      ref={videoRef}
      poster={course.thumbnail || HERO_POSTER_FALLBACK}
      autoPlay
      loop
      muted={isMuted}
      playsInline
      preload="metadata"
      className="w-full h-full object-cover opacity-80"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
    {/* Title block: tighter inset and type below lg, where the 16:9 box is
        shorter than the old fixed-height hero and the title would otherwise
        collide with the action buttons. */}
    <div className="absolute bottom-3 lg:bottom-8 left-0 right-0 max-w-7xl mx-auto px-4 flex justify-between items-end gap-3">
      <div className="animate-fade-in-up min-w-0 flex-1 lg:w-3/4 lg:flex-none">
        <div className="flex items-center gap-2 mb-1.5 lg:mb-3">
          {course.rating && <Badge variant="warning" className="shadow-lg"><Star size={12} fill="currentColor"/> {course.rating}</Badge>}
          <span className="bg-white/20 backdrop-blur text-white px-3 py-0.5 rounded text-xs font-bold border border-white/20">{course.type}</span>
        </div>
        <h1 className="text-xl sm:text-3xl lg:text-6xl font-bold text-white mb-1 lg:mb-3 leading-tight line-clamp-2 lg:line-clamp-none">{course.title}</h1>
        <p className="text-sm lg:text-xl text-white/70 hidden lg:block">By Eyebuckz Academy</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <WishlistButton courseId={course.id} size={20} className="bg-white/10 p-2.5 lg:p-3 rounded-full hover:bg-white/20 backdrop-blur-md border border-white/10 text-white" />
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute trailer' : 'Mute trailer'}
          className="bg-white/10 p-2.5 lg:p-3 rounded-full hover:bg-white/20 backdrop-blur-md transition text-white border border-white/10"
        >
          {isMuted ? <VolumeX size={20} className="lg:size-6" /> : <Volume2 size={20} className="lg:size-6" />}
        </button>
      </div>
    </div>
  </div>
  );
};
