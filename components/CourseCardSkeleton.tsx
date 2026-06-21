import React from 'react';

const shimmer = 'bg-[var(--surface-hover)]';

/**
 * Loading placeholder that mirrors the catalog `CourseCard` shape exactly
 * (aspect-[4/3] thumb → p-6 body → meta row → 2-line title → desc → price/CTA row)
 * so there is no layout shift when the real cards load.
 */
export const CourseCardSkeleton: React.FC = () => {
  return (
    <div className="t-card t-border border rounded-3xl overflow-hidden animate-pulse" role="status" aria-busy="true" aria-label="Loading course card">
      <div className={`relative aspect-[4/3] ${shimmer}`}></div>
      <div className="p-6">
        {/* meta row */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-5 w-12 ${shimmer} rounded-md`}></div>
          <div className={`h-4 w-20 ${shimmer} rounded`}></div>
          <div className={`h-4 w-16 ${shimmer} rounded`}></div>
        </div>
        {/* title (2 lines) */}
        <div className={`h-5 ${shimmer} rounded w-5/6 mb-2`}></div>
        <div className={`h-5 ${shimmer} rounded w-2/3 mb-3`}></div>
        {/* description (2 lines) */}
        <div className={`h-4 ${shimmer} rounded w-full mb-2`}></div>
        <div className={`h-4 ${shimmer} rounded w-4/5 mb-5`}></div>
        {/* divider + price / CTA row */}
        <div className="flex items-center justify-between pt-5 border-t t-border">
          <div className={`h-7 ${shimmer} rounded w-20`}></div>
          <div className={`h-11 ${shimmer} rounded-full w-32`}></div>
        </div>
      </div>
    </div>
  );
};

/**
 * Loading placeholder for an enrolled course on the Dashboard — mirrors that
 * card's shape (h-48 thumb → title → progress bar) rather than the catalog card.
 */
export const EnrolledCourseSkeleton: React.FC = () => {
  return (
    <div className="t-card t-border border rounded-2xl overflow-hidden animate-pulse" role="status" aria-busy="true" aria-label="Loading course">
      <div className={`h-48 ${shimmer}`}></div>
      <div className="p-5">
        <div className={`h-5 ${shimmer} rounded w-3/4 mb-4`}></div>
        <div className="flex justify-between items-center mb-2">
          <div className={`h-3 ${shimmer} rounded w-20`}></div>
          <div className={`h-3 ${shimmer} rounded w-10`}></div>
        </div>
        <div className={`w-full ${shimmer} h-2 rounded-full`}></div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-9 bg-[var(--surface-hover)] rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-5 bg-[var(--surface-hover)] rounded w-64 animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EnrolledCourseSkeleton />
        <EnrolledCourseSkeleton />
        <EnrolledCourseSkeleton />
      </div>
    </div>
  );
};
