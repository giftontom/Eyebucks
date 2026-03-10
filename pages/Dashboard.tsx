import { PlayCircle, UserCircle, Layers, ArrowRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '../components';
import { DashboardSkeleton } from '../components/CourseCardSkeleton';
import { useAuth } from '../context/AuthContext';
import { enrollmentsApi, coursesApi } from '../services/api';
import { CourseType } from '../types';
import { logger } from '../utils/logger';

import type { Course } from '../types';

function relativeTime(date: Date | null | undefined): string {
  if (!date) { return ''; }
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) { return 'Today'; }
  if (days === 1) { return 'Yesterday'; }
  if (days < 30) { return `${days} days ago`; }
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<Array<{
    id: string;
    title: string;
    thumbnail: string;
    progress: number;
    enrollmentId: string;
    enrolledAt: Date;
    lastAccessedAt?: Date | null;
    type?: string;
  }>>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEnrollments = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setLoadError(null);
    setIsLoading(true);

    try {
      const enrollments = await enrollmentsApi.getUserEnrollments();

      const courseIds = enrollments.map(e => e.courseId);
      const coursesData = await coursesApi.getCoursesByIds(courseIds);

      const courseMap = new Map(coursesData.map(c => [c.id, c]));

      const courses = enrollments
        .map(enrollment => {
          const course = courseMap.get(enrollment.courseId);
          if (!course) { return null; }
          return {
            id: course.id,
            title: course.title,
            thumbnail: course.thumbnail,
            type: course.type,
            enrollmentId: enrollment.id,
            progress: enrollment.progress.overallPercent,
            enrolledAt: enrollment.enrolledAt,
            lastAccessedAt: enrollment.lastAccessedAt,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aTime = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : new Date(a.enrolledAt).getTime();
          const bTime = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : new Date(b.enrolledAt).getTime();
          return bTime - aTime;
        });
      setEnrolledCourses(courses);

      // Always load recommendations (non-blocking)
      try {
        const res = await coursesApi.getCourses();
        const enrolledIds = new Set(courses.map(c => c.id));
        setRecommendedCourses(res.courses.filter(c => !enrolledIds.has(c.id)).slice(0, 3));
      } catch {
        // Recommendations are optional, ignore errors
      }
    } catch (error) {
      logger.error('[Dashboard] Error loading enrollments:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load your courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadEnrollments(); }, [user]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (loadError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20 t-status-danger border rounded-2xl">
          <p className="font-medium mb-2">Failed to load your courses</p>
          <p className="text-sm opacity-70 mb-4">{loadError}</p>
          <button onClick={loadEnrollments} className="bg-brand-600 hover:bg-brand-500 text-white font-medium px-6 py-2 rounded-lg transition">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold t-text">My Studio</h1>
          <p className="t-text-2 mt-1">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="t-card t-border border rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center text-xl font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold t-text truncate">{user?.name}</p>
            <p className="text-sm t-text-2 truncate">{user?.email}</p>
          </div>
          <Link
            to="/profile"
            className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium bg-brand-600/10 px-4 py-2 rounded-lg transition hover:bg-brand-600/20"
          >
            <UserCircle size={16} />
            View Profile
          </Link>
        </div>
      </div>

      {enrolledCourses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map(course => {
              const statusLabel = course.progress >= 100 ? 'Completed' : course.progress > 0 ? 'In Progress' : 'Not Started';
              const statusColor = course.progress >= 100 ? 'text-green-400' : course.progress > 0 ? 'text-brand-400' : 't-text-3';
              return (
                <div key={course.id} className="t-card t-border border rounded-2xl overflow-hidden hover:bg-[var(--surface-hover)] transition group duration-300">
                  <div className="relative h-48">
                    <img src={course.thumbnail} className="w-full h-full object-cover" alt={course.title} />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                      <PlayCircle size={56} className="text-white drop-shadow-lg scale-90 group-hover:scale-100 transition" />
                    </div>
                    {course.type === CourseType.BUNDLE && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="brand"><Layers size={10} /> BUNDLE</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg t-text leading-tight">{course.title}</h3>
                      <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
                    </div>
                    <div className="w-full t-bg-alt h-2 rounded-full mb-2 overflow-hidden">
                      <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${course.progress || 0}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center text-sm t-text-3 mb-1">
                      <span>{course.progress || 0}% Completed</span>
                    </div>
                    {course.lastAccessedAt && (
                      <p className="text-xs t-text-3 mb-4">Last accessed: {relativeTime(course.lastAccessedAt)}</p>
                    )}
                    {!course.lastAccessedAt && <div className="mb-4" />}
                    <Link
                      to={`/learn/${course.id}`}
                      className="block w-full text-center t-card hover:bg-[var(--surface-hover)] t-border border py-3 rounded-lg font-medium transition t-text"
                    >
                      {course.type === CourseType.BUNDLE ? 'View Bundle' : course.progress >= 100 ? 'Review Course' : course.progress > 0 ? 'Continue Learning' : 'Start Learning'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {recommendedCourses.length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-bold t-text mb-6">You Might Also Like</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recommendedCourses.map(course => (
                  <Link
                    key={course.id}
                    to={`/course/${course.id}`}
                    className="t-card t-border border rounded-xl overflow-hidden hover:bg-[var(--surface-hover)] transition group"
                  >
                    <img src={course.thumbnail} alt={course.title} className="w-full h-32 object-cover" />
                    <div className="p-4">
                      <p className="font-semibold t-text text-sm leading-tight mb-1 group-hover:text-brand-400 transition">{course.title}</p>
                      <p className="text-xs t-text-3">₹{(course.price / 100).toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 t-card rounded-2xl t-border border">
          <p className="text-xl font-bold t-text mb-2">No courses yet</p>
          <p className="t-text-2 mb-6">You haven't enrolled in any masterclasses yet. Start your filmmaking journey today.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3 rounded-full transition">
            Browse Catalog <ArrowRight size={16} />
          </Link>

          {recommendedCourses.length > 0 && (
            <div className="mt-12 text-left max-w-3xl mx-auto px-4">
              <h3 className="text-lg font-bold t-text mb-6">Recommended for You</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {recommendedCourses.map(course => (
                  <Link
                    key={course.id}
                    to={`/course/${course.id}`}
                    className="t-card t-border border rounded-xl overflow-hidden hover:bg-[var(--surface-hover)] transition group"
                  >
                    <img src={course.thumbnail} alt={course.title} className="w-full h-32 object-cover" />
                    <div className="p-4">
                      <p className="font-semibold t-text text-sm leading-tight mb-1 group-hover:text-brand-400 transition">{course.title}</p>
                      <p className="text-xs t-text-3">₹{(course.price / 100).toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
