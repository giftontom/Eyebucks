import { Play, Star, ArrowRight, Layers, Clapperboard } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { FadeIn } from './FadeIn';
import { Badge } from './Badge';
import { Thumbnail } from './Thumbnail';
import { WishlistButton } from './WishlistButton';

import { formatPrice, showsComparePrice } from '../utils/format';
import { CourseType } from '../types';
import type { Course } from '../types';

interface CourseCardProps {
  course: Course;
  index: number;
  /** Skip the FadeIn entrance — used inside HorizontalGallery, where the
   *  horizontal scrub is the motion (a per-card reveal won't trigger right
   *  for cards translated off to the side). */
  disableReveal?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, index, disableReveal = false }) => {
  const isBundle = course.type === CourseType.BUNDLE;
  const isNew = course.publishedAt && (Date.now() - new Date(course.publishedAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
  const card = (
    <div data-scene-card className="group flex flex-col t-card rounded-3xl overflow-hidden t-border border hover:border-brand-500/30 dark:hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none h-full backdrop-blur-sm">
        <Link to={`/course/${course.id}`} className="relative overflow-hidden t-bg-alt block aspect-video">
          <Thumbnail
            src={course.thumbnail}
            alt={course.title}
            loading={index < 2 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className="w-full h-full object-cover transition-transform duration-700 group-live:scale-105 dark:opacity-75 group-live:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge variant="default" size="md" className="uppercase tracking-wide backdrop-blur-md">{course.type}</Badge>
            {isNew && <Badge variant="success" size="md" className="uppercase tracking-wide backdrop-blur-md shadow-lg shadow-green-500/30">New</Badge>}
            {isBundle && <Badge variant="brand" size="md" className="uppercase tracking-wide animate-pulse shadow-lg shadow-brand-500/40">Best Value</Badge>}
          </div>
          <div className="absolute top-3 right-3">
            <WishlistButton courseId={course.id} size={18} className="bg-black/40 backdrop-blur-sm p-2 rounded-full hover:bg-black/60" />
          </div>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-live:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <div className="group-live:scale-110 transition-transform duration-300 flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/50 backdrop-blur-md">
                <Play size={32} fill="white" className="ml-1 text-white" />
              </div>
              <span className="text-white font-bold tracking-widest text-sm uppercase">Preview Course</span>
            </div>
          </div>
        </Link>
        <div className="p-5 md:p-6 flex flex-col flex-grow">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-xs">
            {course.rating && (course.totalStudents ?? 0) > 0 ? (
              <div className="inline-flex items-center gap-1 text-[color:var(--color-rating-star)] bg-[color:var(--color-rating-bg)] px-2.5 py-1 rounded-lg font-bold">
                <Star size={13} fill="currentColor" />
                <span>{course.rating.toFixed(1)}</span>
              </div>
            ) : null}
            {isBundle && course.bundledCourses ? (
              <span className="inline-flex items-center gap-1 t-text-3 font-medium"><Layers size={13} /> {course.bundledCourses.length}</span>
            ) : (
              <span className="inline-flex items-center gap-1 t-text-3 font-medium"><Clapperboard size={13} /> {(course.chapters?.length || 0)}</span>
            )}
          </div>
          <Link to={`/course/${course.id}`} className="block flex-grow">
            <h3 lang={course.language === 'ML' ? 'ml' : undefined} className="text-lg md:text-xl font-bold t-text mb-2 group-live:text-brand-400 transition-colors leading-snug line-clamp-2 min-h-14">{course.title}</h3>
            <p lang={course.language === 'ML' ? 'ml' : undefined} className="t-text-2 text-sm leading-relaxed line-clamp-2 mb-4">{course.description}</p>
          </Link>
          <div className="mt-auto pt-4 md:pt-5 border-t t-border flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold t-text">{formatPrice(course.price)}</span>
              {showsComparePrice(course.price, course.comparePrice) && (
                <span className="text-sm t-text-3 line-through">{formatPrice(course.comparePrice)}</span>
              )}
            </div>
            <Link
              to={`/course/${course.id}`}
              className="bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 transition-all duration-200 active:scale-95 shadow-lg shadow-brand-600/20 hover:-translate-y-0.5 shrink-0"
            >
              <span className="hidden sm:inline">View</span>
              <span className="sm:hidden">View</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
  );
  if (disableReveal) { return card; }
  return (
    <FadeIn delay={index * 50} direction="right" className="h-full">
      {card}
    </FadeIn>
  );
};
CourseCard.displayName = 'CourseCard';
