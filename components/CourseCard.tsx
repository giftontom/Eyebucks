import { Play, Star, ArrowRight, Users, Layers, Clapperboard } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { FadeIn } from './FadeIn';
import { Badge } from './Badge';
import { Thumbnail } from './Thumbnail';
import { WishlistButton } from './WishlistButton';

import { CourseType } from '../types';
import type { Course } from '../types';

interface CourseCardProps {
  course: Course;
  index: number;
  onBuy: (courseId: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, index, onBuy }) => {
  const isBundle = course.type === CourseType.BUNDLE;
  const isNew = course.publishedAt && (Date.now() - new Date(course.publishedAt).getTime()) < 30 * 24 * 60 * 60 * 1000;
  return (
    <FadeIn delay={index * 50} className={`${isBundle ? 'lg:col-span-2' : ''}`}>
      <div className="group flex flex-col t-card rounded-3xl overflow-hidden t-border border hover:border-brand-500/30 dark:hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none h-full backdrop-blur-sm">
        <Link to={`/course/${course.id}`} className={`relative overflow-hidden bg-neutral-200 dark:bg-neutral-900 block ${isBundle ? 'aspect-[2.2/1]' : 'aspect-[4/3]'}`}>
          <Thumbnail
            src={course.thumbnail}
            alt={course.title}
            loading={index < 2 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 dark:opacity-75 group-hover:opacity-100"
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
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <div className="group-hover:scale-110 transition-transform duration-300 flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/50 backdrop-blur-md">
                <Play size={32} fill="white" className="ml-1 text-white" />
              </div>
              <span className="text-white font-bold tracking-widest text-sm uppercase">Preview Course</span>
            </div>
          </div>
        </Link>
        <div className="p-8 flex flex-col flex-grow">
          <div className="flex items-center gap-3 mb-4 text-xs font-bold t-text-3">
            {course.rating ? (
              <div className="flex text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">
                <Star size={12} fill="currentColor" className="mr-1" />
                <span>{course.rating.toFixed(1)}</span>
              </div>
            ) : null}
            <span className="flex items-center gap-1 t-text-2"><Users size={12} /> {course.totalStudents || 0} Students</span>
            {isBundle && course.bundledCourses ? (
              <span className="flex items-center gap-1 t-text-2"><Layers size={12} /> {course.bundledCourses.length} Courses</span>
            ) : (
              <span className="flex items-center gap-1 t-text-2"><Clapperboard size={12} /> {(course.chapters?.length || 0)} Lessons</span>
            )}
          </div>
          <Link to={`/course/${course.id}`} className="block">
            <h3 className="text-2xl font-bold t-text mb-3 group-hover:text-brand-400 transition-colors leading-tight">{course.title}</h3>
            <p className="t-text-2 mb-8 line-clamp-2 text-sm leading-relaxed">{course.description}</p>
          </Link>
          <div className="mt-auto flex items-center justify-between pt-6 border-t t-border">
            <div className="flex flex-col">
              <div className="text-2xl font-bold t-text">₹{(course.price / 100).toLocaleString()}</div>
            </div>
            <button
              onClick={(e) => {e.stopPropagation(); e.preventDefault(); onBuy(course.id);}}
              className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-brand-600/20 hover:-translate-y-0.5"
            >
              Buy Now <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
};
CourseCard.displayName = 'CourseCard';
