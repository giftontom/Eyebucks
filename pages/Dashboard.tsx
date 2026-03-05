import { PlayCircle, UserCircle, Layers } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { DashboardSkeleton } from '../components/CourseCardSkeleton';
import { useAuth } from '../context/AuthContext';
import { enrollmentsApi, coursesApi } from '../services/api';
import { CourseType } from '../types';
import { logger } from '../utils/logger';

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
          if (!course) {return null;}
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
        .filter(Boolean);
      setEnrolledCourses(courses);
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
        <div className="text-center py-20 bg-red-50 rounded-2xl border border-red-200">
          <p className="text-red-700 font-medium mb-2">Failed to load your courses</p>
          <p className="text-red-500 text-sm mb-4">{loadError}</p>
          <button onClick={loadEnrollments} className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2 rounded-lg transition">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const myCourses = enrolledCourses;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">My Studio</h1>
           <p className="text-slate-500 mt-1">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xl font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-sm text-slate-500 truncate">{user?.email}</p>
          </div>
          <Link
            to="/profile"
            className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium bg-brand-50 px-4 py-2 rounded-lg transition hover:bg-brand-100"
          >
            <UserCircle size={16} />
            View Profile
          </Link>
        </div>
      </div>

      {myCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {myCourses.map(course => (
             <div key={course.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition group duration-300">
                <div className="relative h-48">
                   <img src={course.thumbnail} className="w-full h-full object-cover" alt={course.title} />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                      <PlayCircle size={56} className="text-white drop-shadow-lg scale-90 group-hover:scale-100 transition" />
                   </div>
                   {course.type === CourseType.BUNDLE && (
                     <div className="absolute top-3 left-3">
                       <span className="bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                         <Layers size={10} /> BUNDLE
                       </span>
                     </div>
                   )}
                </div>
                <div className="p-6">
                   <h3 className="font-bold text-lg mb-3 text-slate-900 leading-tight">{course.title}</h3>
                   <div className="w-full bg-slate-100 h-2 rounded-full mb-4 overflow-hidden">
                      <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${course.progress || 0}%` }}></div>
                   </div>
                   <div className="flex justify-between items-center text-sm text-slate-500 mb-6">
                      <span>{course.progress || 0}% Completed</span>
                   </div>
                   <Link
                     to={`/learn/${course.id}`}
                     className="block w-full text-center bg-slate-900 hover:bg-slate-800 py-3 rounded-lg font-medium transition text-white"
                   >
                     {course.type === CourseType.BUNDLE ? 'View Bundle' : 'Continue Learning'}
                   </Link>
                </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-slate-500 mb-4">You haven't enrolled in any masterclasses yet.</p>
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-bold">Browse Catalog</Link>
        </div>
      )}
    </div>
  );
};