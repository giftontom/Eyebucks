import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Play, Volume2, VolumeX, ChevronDown, ChevronUp, Lock, Zap, Star, User, ArrowRight, Loader2, Layers, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { useVideoUrl } from '../hooks/useVideoUrl';
import { coursesApi } from '../services/api';
import ReviewList from '../components/ReviewList';
import { CourseType } from '../types';
import type { Course } from '../types';

const FALLBACK_VIDEO = 'https://joy1.videvo.net/videvo_files/video/free/2019-11/large_watermarked/190301_1_25_11_preview.mp4';

export const CourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { hasAccess, isLoading: isCheckingAccess, isEnrolled, isAdmin } = useAccessControl(id);

  const fetchCourse = () => {
    if (!id) { setIsLoadingCourse(false); return; }
    setLoadError(null);
    setIsLoadingCourse(true);
    coursesApi.getCourse(id)
      .then(res => setCourse(res.course))
      .catch((err) => setLoadError(err.message || 'Failed to load course'))
      .finally(() => setIsLoadingCourse(false));
  };

  useEffect(() => { fetchCourse(); }, [id]);
  const { videoUrl: heroVideoSrc } = useVideoUrl(course?.heroVideoId, null, FALLBACK_VIDEO);
  const [isMuted, setIsMuted] = useState(true);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CURRICULUM' | 'COURSES' | 'REVIEWS'>('OVERVIEW');
  const [showSticky, setShowSticky] = useState(false);

  // Ref for the main Call-to-Action button to track visibility
  const mainCtaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky footer when the main CTA is NOT visible
        setShowSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: "-100px 0px 0px 0px" // Offset slightly so it triggers before it's completely gone
      }
    );

    if (mainCtaRef.current) {
      observer.observe(mainCtaRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  if (isLoadingCourse) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={48} /></div>;
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Failed to load course</h2>
        <p className="text-slate-500 mb-6">{loadError}</p>
        <button onClick={fetchCourse} className="bg-brand-600 hover:bg-brand-700 text-white font-medium px-6 py-2 rounded-lg transition">Try Again</button>
      </div>
    </div>
  );
  if (!course) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Course not found</h2>
        <Link to="/" className="text-brand-600 hover:text-brand-700 font-bold">Back to Catalog</Link>
      </div>
    </div>
  );

  const handleCTA = async () => {
    // If user has access (enrolled or admin), go to course
    if (hasAccess) {
      navigate(`/learn/${course.id}`);
      return;
    }

    // If not logged in, trigger login
    if (!user) {
      await login();
      return;
    }

    // If logged in but not enrolled, go to checkout
    navigate(`/checkout/${course.id}`);
  };

  // Determine CTA button text and styling
  const getCtaConfig = () => {
    if (isCheckingAccess) {
      return { text: 'Loading...', disabled: true };
    }
    if (hasAccess) {
      return { text: 'Continue Learning', icon: <ArrowRight size={20} />, disabled: false };
    }
    if (!user) {
      return { text: 'Login to Enroll', disabled: false };
    }
    return { text: 'Enroll Now', icon: <Zap size={20} />, disabled: false };
  };

  const ctaConfig = getCtaConfig();

  return (
    <div className="pb-24 bg-white">
      {/* Video Trailer Header */}
      <div className="relative h-[40vh] md:h-[60vh] bg-black group">
        <video
          src={heroVideoSrc || FALLBACK_VIDEO}
          poster={course.thumbnail || 'https://images.unsplash.com/photo-1478720568477-152d9b164e63?auto=format&fit=crop&q=80&w=1920'}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
        <div className="absolute bottom-8 left-0 right-0 max-w-7xl mx-auto px-4 flex justify-between items-end">
           <div className="animate-fade-in-up w-3/4">
              <div className="flex items-center gap-2 mb-3">
                 {course.rating && <div className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 shadow-lg"><Star size={12} fill="currentColor"/> {course.rating}</div>}
                 <span className="bg-white/20 backdrop-blur text-white px-3 py-0.5 rounded text-xs font-bold border border-white/20">{course.type}</span>
              </div>
              <h1 className="text-3xl md:text-6xl font-bold text-white mb-3 leading-tight">{course.title}</h1>
              <p className="text-sm md:text-xl text-gray-200 hidden md:block">By Eyebuckz Academy</p>
           </div>
           <button 
             onClick={() => setIsMuted(!isMuted)}
             className="bg-white/10 p-3 rounded-full hover:bg-white/20 backdrop-blur-md transition text-white border border-white/10"
           >
             {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
           </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
            
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
              {(() => {
                const isBundle = course.type === CourseType.BUNDLE;
                const tabs = isBundle
                  ? (['OVERVIEW', 'COURSES', 'REVIEWS'] as const)
                  : (['OVERVIEW', 'CURRICULUM', 'REVIEWS'] as const);
                return tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-4 font-bold text-sm transition border-b-2 whitespace-nowrap ${
                        activeTab === tab
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                      {tab === 'COURSES' ? `INCLUDED COURSES (${course.bundledCourses?.length || 0})` : tab}
                  </button>
                ));
              })()}
          </div>

          <div className="min-h-[300px]">
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-slate-900">Course Overview</h2>
                    <p className="text-slate-600 leading-relaxed text-lg">
                    {course.description}. Designed for visual storytellers who want to master the craft. We cover everything from pre-production planning to post-production delivery.
                    </p>
                    
                    <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">What you'll learn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {course.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-3 text-slate-600">
                                <Zap size={18} className="text-brand-600 mt-1 flex-shrink-0" />
                                <span>{feat}</span>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Enroll Button (Main CTA) */}
                    <div className="mt-8 lg:hidden">
                       <button
                          ref={mainCtaRef}
                          onClick={handleCTA}
                          disabled={ctaConfig.disabled}
                          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                        >
                          {ctaConfig.icon}
                          {hasAccess ? ctaConfig.text : `${ctaConfig.text} • ₹${(course.price / 100).toLocaleString()}`}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'CURRICULUM' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-900">Course Content</h2>
                        <span className="text-slate-500 text-sm">{(course.chapters?.length || 0)} Chapters</span>
                    </div>
                    {(course.chapters || []).map((chapter, index) => (
                        <div key={chapter.id} className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                            <button 
                            onClick={() => setOpenChapter(openChapter === chapter.id ? null : chapter.id)}
                            className="w-full flex items-center justify-between p-5 hover:bg-slate-100 transition"
                            >
                            <div className="flex items-center gap-4">
                                <span className="text-slate-400 font-mono font-bold">0{index + 1}</span>
                                <span className="font-bold text-slate-800 text-left">{chapter.title}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-500">{chapter.duration}</span>
                                {openChapter === chapter.id ? <ChevronUp size={20} className="text-brand-600" /> : <ChevronDown size={20} className="text-slate-400" />}
                            </div>
                            </button>
                            {openChapter === chapter.id && (
                            <div className="p-5 bg-white text-sm text-slate-500 border-t border-slate-200 flex items-center gap-2">
                                <Lock size={14} /> Content locked. Enroll to access video and resources.
                            </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'COURSES' && course.type === CourseType.BUNDLE && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-slate-900">What's Included</h2>
                        <span className="text-slate-500 text-sm">{course.bundledCourses?.length || 0} Courses</span>
                    </div>
                    <p className="text-slate-500 text-sm mb-6">This bundle includes full access to the following courses:</p>
                    <div className="space-y-4">
                        {(course.bundledCourses || []).map((bc, index) => (
                            <div
                                key={bc.id}
                                onClick={() => navigate(`/course/${bc.id}`)}
                                className="flex gap-4 p-4 border border-slate-200 rounded-xl hover:border-brand-500/30 hover:shadow-md transition cursor-pointer group bg-white"
                            >
                                <div className="w-24 h-24 md:w-32 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                                    {bc.thumbnail ? (
                                        <img src={bc.thumbnail} alt={bc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                            <BookOpen size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-slate-400">COURSE {index + 1}</span>
                                        {bc.rating && (
                                            <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                                                <Star size={10} fill="currentColor" />
                                                {bc.rating}
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">{bc.title}</h4>
                                    <p className="text-sm text-slate-500 line-clamp-1 mt-1">{bc.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><Layers size={12} /> {bc.moduleCount} Lessons</span>
                                        <span className="flex items-center gap-1"><User size={12} /> {bc.totalStudents} Students</span>
                                        {bc.price > 0 && <span className="line-through">₹{(bc.price / 100).toLocaleString()}</span>}
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center text-slate-400 group-hover:text-brand-600 transition-colors">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {course.bundledCourses && course.bundledCourses.length > 0 && (() => {
                        const savings = course.bundledCourses.reduce((sum, c) => sum + c.price, 0) - course.price;
                        return savings > 0 ? (
                            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mt-6">
                                <p className="text-sm text-brand-800 font-medium flex items-center gap-2">
                                    <Zap size={16} className="text-brand-600" />
                                    Save ₹{(savings / 100).toLocaleString()} compared to buying individually
                                </p>
                            </div>
                        ) : null;
                    })()}
                </div>
            )}

            {activeTab === 'REVIEWS' && (
                <div className="animate-fade-in">
                    <ReviewList
                      courseId={course.id}
                      canReview={!!user && isEnrolled}
                    />
                </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar (Always Visible) */}
        <div className="hidden lg:block">
          <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50">
            {!hasAccess && (
              <>
                <h3 className="text-4xl font-bold text-slate-900 mb-2">₹{(course.price / 100).toLocaleString()}</h3>
                <p className="text-slate-500 text-sm mb-8">One-time payment. Lifetime access.</p>
              </>
            )}
            {hasAccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-800 font-bold text-sm flex items-center gap-2">
                  <Zap size={16} className="text-green-600" />
                  You're enrolled in this course
                </p>
              </div>
            )}

            <button
              onClick={handleCTA}
              disabled={ctaConfig.disabled}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 mb-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ctaConfig.icon}
              {ctaConfig.text}
            </button>
            
            {course.type === CourseType.BUNDLE && course.bundledCourses && course.bundledCourses.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Layers size={16} className="text-brand-600" /> Includes {course.bundledCourses.length} Courses
                </h4>
                <div className="space-y-2">
                  {course.bundledCourses.map((bc) => (
                    <div key={bc.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <BookOpen size={14} className="text-brand-500 flex-shrink-0" />
                      <span className="truncate">{bc.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 mt-8 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <User size={18} className="text-brand-600" />
                    <span>Beginner to Advanced</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Zap size={18} className="text-brand-600" />
                    <span>Instant Access</span>
                </div>
                 <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Lock size={18} className="text-brand-600" />
                    <span>Secure Payment</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Buy Button (Conditionally Rendered) */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 lg:hidden z-40 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.1)] safe-pb transition-transform duration-300 ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}>
        {!hasAccess ? (
          <>
            <div>
              <p className="text-xs text-slate-500">Total Price</p>
              <p className="text-xl font-bold text-slate-900">₹{(course.price / 100).toLocaleString()}</p>
            </div>
            <button
              onClick={handleCTA}
              disabled={ctaConfig.disabled}
              className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              {ctaConfig.text}
            </button>
          </>
        ) : (
          <button
            onClick={handleCTA}
            disabled={ctaConfig.disabled}
            className="w-full bg-slate-900 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            {ctaConfig.icon}
            {ctaConfig.text}
          </button>
        )}
      </div>
    </div>
  );
};