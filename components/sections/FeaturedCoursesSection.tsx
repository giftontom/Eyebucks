import { ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../../context/LanguageContext';
import { useSiteSection } from '../../context/SiteContentContext';
import { coursesApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { CourseCard } from '../CourseCard';
import { FadeIn } from '../FadeIn';
import { HorizontalGallery } from '../HorizontalGallery';

import type { Course } from '../../types';

const FEATURED_COUNT = 4;

// Header/CTA copy — defaults are the verbatim hardcoded literals; CMS
// (section 'featured_copy', singleton row) can override per-field. Course
// cards remain sourced from the courses table and are untouched by this.
const DEFAULT_COPY = {
  pill: 'Top Courses',
  title: 'Start Your Journey.',
  body: 'Our most popular courses, handpicked by thousands of creators.',
  ctaLabel: 'View All Courses',
};

export const FeaturedCoursesSection: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const copyRows = useSiteSection('featured_copy');

  useEffect(() => {
    coursesApi.getCourses({ page: 1, pageSize: FEATURED_COUNT, withCount: false, language })
      .then(res => setCourses(res.courses))
      // Non-critical: a failure leaves `courses` empty and the section stays
      // hidden, which is the same outcome as a language with no courses.
      .catch(err => logger.error('[FeaturedCoursesSection] Failed to load courses:', err))
      .finally(() => setIsLoading(false));
  }, [language]);

  // CMS override for header/CTA copy only — singleton row [0], per-field
  // fallback to DEFAULT_COPY. Derived in render so the defaults are never
  // painted first when the CMS payload is already known.
  const copy = useMemo(() => {
    const item = copyRows?.[0];
    if (!item) { return DEFAULT_COPY; }
    const meta = (item.metadata || {}) as Record<string, unknown>;
    return {
      pill: typeof meta.pill === 'string' && meta.pill ? meta.pill : DEFAULT_COPY.pill,
      title: item.title || DEFAULT_COPY.title,
      body: item.body || DEFAULT_COPY.body,
      ctaLabel: typeof meta.ctaLabel === 'string' && meta.ctaLabel ? meta.ctaLabel : DEFAULT_COPY.ctaLabel,
    };
  }, [copyRows]);

  // Occupy no space until we know there is something to show.
  //
  // This section used to render a full-height skeleton while loading and then
  // `return null` when the query came back empty — collapsing ~2200px out of
  // the middle of the document and yanking everything below it, footer
  // included, up the page. That is the "footer shift" people saw: it fires
  // late, after the page already looks settled.
  //
  // The empty result is not hypothetical. `getCourses` filters by the
  // visitor's storefront language, so a language with no published courses
  // (currently EN — every published course is ML) reliably takes this path.
  //
  // Rendering nothing while loading turns a late collapse into an ordinary
  // mount, which is what every other section on this page already does.
  //
  // This also makes the in-render skeleton branch unreachable, so it is gone;
  // CourseCardSkeleton is still used by the catalog page, where the section is
  // always present and therefore cannot collapse.
  //
  // Errors collapse into the same condition: the section is non-critical, so a
  // failed fetch leaves `courses` empty and it stays hidden, exactly as before.
  if (isLoading || courses.length === 0) {
    return null;
  }

  return (
    // No border-t (it would draw a literal seam line on the scene-graded
    // canvas); pulled up over the hero's reserve so the card rail bridges
    // the scene change — the eye follows content, not the backdrop.
    <section id="featured-courses" className="relative py-20 md:py-28 -mt-16 md:-mt-20 t-bg" style={{ scrollMarginTop: '5rem' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HorizontalGallery
            count={courses.length}
            desktopGrid="md:grid-cols-2 lg:grid-cols-4"
            heading={
              <FadeIn>
                <div className="flex flex-col sm:flex-row items-end justify-between mb-12 gap-4">
                  <div>
                    <span className="inline-block px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 scene-adaptive-brand rounded-full font-bold tracking-wider uppercase text-xs mb-4">
                      {copy.pill}
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold scene-adaptive-text" style={{ fontFamily: 'var(--font-display)' }}>
                      {copy.title}
                    </h2>
                    <p className="scene-adaptive-text-2 text-lg mt-2 max-w-xl">
                      {copy.body}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/courses')}
                    data-live
                    className="group flex items-center gap-2 scene-adaptive-brand hover:text-brand-300 font-bold text-sm transition-colors shrink-0"
                  >
                    {copy.ctaLabel} <ArrowRight size={16} className="group-live:translate-x-1 transition-transform" />
                  </button>
                </div>
              </FadeIn>
            }
          >
            {courses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} disableReveal />
            ))}
          </HorizontalGallery>
      </div>
    </section>
  );
};
