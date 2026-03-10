import React from 'react';

export const CourseCardSkeleton: React.FC = () => {
  const bg = 't-card t-border';
  const shimmer = 'bg-[var(--surface-hover)]';
  return (
    <div className={`${bg} border rounded-2xl overflow-hidden animate-pulse`}>
      <div className={`relative h-48 ${shimmer}`}></div>
      <div className="p-6">
        <div className={`h-6 ${shimmer} rounded w-3/4 mb-3`}></div>
        <div className={`w-full t-bg-alt h-2 rounded-full mb-4`}>
          <div className={`${shimmer} h-2 rounded-full w-1/3`}></div>
        </div>
        <div className="flex justify-between items-center mb-6">
          <div className={`h-4 ${shimmer} rounded w-24`}></div>
        </div>
        <div className={`h-12 ${shimmer} rounded-lg w-full`}></div>
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
        <CourseCardSkeleton />
        <CourseCardSkeleton />
        <CourseCardSkeleton />
      </div>
    </div>
  );
};
