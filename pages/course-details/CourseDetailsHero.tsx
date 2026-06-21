import { Star, Volume2, VolumeX } from 'lucide-react';
import React from 'react';

import { Badge, WishlistButton } from '../../components';

import type { Course } from '../../types';

interface Props {
  course: Course;
  heroVideoSrc: string | null;
  fallbackVideo: string;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const CourseDetailsHero: React.FC<Props> = ({ course, heroVideoSrc, fallbackVideo, isMuted, onToggleMute }) => (
  <div className="relative h-[40vh] md:h-[60vh] bg-black group">
    <video
      src={heroVideoSrc || fallbackVideo}
      poster={course.thumbnail || 'https://images.unsplash.com/photo-1478720568477-152d9b164e63?auto=format&fit=crop&q=80&w=1920'}
      autoPlay
      loop
      muted={isMuted}
      playsInline
      className="w-full h-full object-cover opacity-80"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
    <div className="absolute bottom-8 left-0 right-0 max-w-7xl mx-auto px-4 flex justify-between items-end">
      <div className="animate-fade-in-up w-3/4">
        <div className="flex items-center gap-2 mb-3">
          {course.rating && <Badge variant="warning" className="shadow-lg"><Star size={12} fill="currentColor"/> {course.rating}</Badge>}
          <span className="bg-white/20 backdrop-blur text-white px-3 py-0.5 rounded text-xs font-bold border border-white/20">{course.type}</span>
        </div>
        <h1 className="text-3xl md:text-6xl font-bold text-white mb-3 leading-tight">{course.title}</h1>
        <p className="text-sm md:text-xl text-white/70 hidden md:block">By Eyebuckz Academy</p>
      </div>
      <div className="flex items-center gap-2">
        <WishlistButton courseId={course.id} size={22} className="bg-white/10 p-3 rounded-full hover:bg-white/20 backdrop-blur-md border border-white/10 text-white" />
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute trailer' : 'Mute trailer'}
          className="bg-white/10 p-3 rounded-full hover:bg-white/20 backdrop-blur-md transition text-white border border-white/10"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>
    </div>
  </div>
);
