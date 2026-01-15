import React from 'react';

export const CourseCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="relative h-48 bg-slate-200"></div>

      {/* Content skeleton */}
      <div className="p-6">
        {/* Title skeleton */}
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>

        {/* Progress bar skeleton */}
        <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
          <div className="bg-slate-200 h-2 rounded-full w-1/3"></div>
        </div>

        {/* Progress text skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
        </div>

        {/* Button skeleton */}
        <div className="h-12 bg-slate-200 rounded-lg w-full"></div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-9 bg-slate-200 rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-5 bg-slate-200 rounded w-64 animate-pulse"></div>
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
