import { ArrowRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { CourseCard } from '../CourseCard';
import { CourseCardSkeleton } from '../CourseCardSkeleton';
import { FadeIn } from '../FadeIn';
import { HorizontalGallery } from '../HorizontalGallery';
import { coursesApi } from '../../services/api';
import { logger } from '../../utils/logger';

import type { Course } from '../../types';

const FEATURED_COUNT = 4;

export const FeaturedCoursesSection: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    coursesApi.getCourses({ page: 1, pageSize: FEATURED_COUNT, withCount: false })
      .then(res => {
        setCourses(res.courses);
        setHasError(false);
      })
      .catch(err => {
        logger.error('[FeaturedCoursesSection] Failed to load courses:', err);
        setHasError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Don't render anything if no courses and not loading
  if (!isLoading && !hasError && courses.length === 0) {
    return null;
  }

  // Don't render on error — section is non-critical, silently hide
  if (hasError && courses.length === 0) {
    return null;
  }

  return (
    // No border-t (it would draw a literal seam line on the scene-graded
    // canvas); pulled up over the hero's reserve so the card rail bridges
    // the scene change — the eye follows content, not the backdrop.
    <section id="featured-courses" className="relative py-20 md:py-28 -mt-16 md:-mt-20 t-bg" style={{ scrollMarginTop: '5rem' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <>
            <div className="mb-12">
              <span className="inline-block px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 scene-adaptive-brand rounded-full font-bold tracking-wider uppercase text-xs mb-4">
                Top Courses
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold scene-adaptive-text" style={{ fontFamily: 'var(--font-display)' }}>
                Start Your Journey.
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: FEATURED_COUNT }).map((_, i) => (
                <CourseCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <HorizontalGallery
            count={courses.length}
            desktopGrid="md:grid-cols-2 lg:grid-cols-4"
            heading={
              <FadeIn>
                <div className="flex flex-col sm:flex-row items-end justify-between mb-12 gap-4">
                  <div>
                    <span className="inline-block px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 scene-adaptive-brand rounded-full font-bold tracking-wider uppercase text-xs mb-4">
                      Top Courses
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold scene-adaptive-text" style={{ fontFamily: 'var(--font-display)' }}>
                      Start Your Journey.
                    </h2>
                    <p className="scene-adaptive-text-2 text-lg mt-2 max-w-xl">
                      Our most popular courses, handpicked by thousands of creators.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/courses')}
                    data-live
                    className="group flex items-center gap-2 scene-adaptive-brand hover:text-brand-300 font-bold text-sm transition-colors shrink-0"
                  >
                    View All Courses <ArrowRight size={16} className="group-live:translate-x-1 transition-transform" />
                  </button>
                </div>
              </FadeIn>
            }
          >
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} disableReveal />
            ))}
          </HorizontalGallery>
        )}
      </div>
    </section>
  );
};
