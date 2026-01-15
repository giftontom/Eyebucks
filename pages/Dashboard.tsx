import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_COURSES } from '../constants';
import { PlayCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { enrollmentService } from '../services/enrollmentService';
import { DashboardSkeleton } from '../components/CourseCardSkeleton';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user's enrolled courses
  useEffect(() => {
    const loadEnrollments = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get user's enrollments
      const enrollments = await enrollmentService.getUserEnrollments(user.id);

      // Map enrollments to full course objects with progress
      const courses = enrollments
        .map(enrollment => {
          const course = MOCK_COURSES.find(c => c.id === enrollment.courseId);
          if (!course) return null;

          return {
            ...course,
            enrollmentId: enrollment.id,
            progress: enrollment.progress.overallPercent,
            enrolledAt: enrollment.enrolledAt,
            lastAccessedAt: enrollment.lastAccessedAt
          };
        })
        .filter(Boolean); // Remove null values

      setEnrolledCourses(courses);
      setIsLoading(false);
    };

    loadEnrollments();
  }, [user]);

  // Show loading state
  if (isLoading) {
    return <DashboardSkeleton />;
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

      {myCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {myCourses.map(course => (
             <div key={course.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition group duration-300">
                <div className="relative h-48">
                   <img src={course.thumbnail} className="w-full h-full object-cover" alt={course.title} />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                      <PlayCircle size={56} className="text-white drop-shadow-lg scale-90 group-hover:scale-100 transition" />
                   </div>
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
                     Resume Editing
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