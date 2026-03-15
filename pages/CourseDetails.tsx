import { Play, Volume2, VolumeX, ChevronDown, ChevronUp, Lock, Zap, Star, User, ArrowRight, Loader2, Layers, BookOpen } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { Button, Badge, WishlistButton, ShareButton } from '../components';
import { ReviewList } from '../components/ReviewList';
import { useAuth } from '../context/AuthContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { useVideoUrl } from '../hooks/useVideoUrl';
import { coursesApi } from '../services/api';
import { CourseType } from '../types';
import { analytics } from '../utils/analytics';

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
      .then(res => {
        setCourse(res.course);
        analytics.track('course_viewed', {
          course_id: res.course.id,
          course_title: res.course.title,
          course_type: res.course.type,
          price: res.course.price,
        });
      })
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

  if (isLoadingCourse) {return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={48} /></div>;}
  if (loadError) {return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 t-status-danger border rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold t-text mb-2">Failed to load course</h2>
        <p className="t-text-2 mb-6">{loadError}</p>
        <Button onClick={fetchCourse}>Try Again</Button>
      </div>
    </div>
  );}
  if (!course) {return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold t-text mb-4">Course not found</h2>
        <Link to="/" className="text-brand-600 hover:text-brand-700 font-bold">Back to Catalog</Link>
      </div>
    </div>
  );}

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

  const courseDescription = course.description?.slice(0, 160) || '';

  return (
    <div className="pb-24 t-bg">
      <Helmet>
        <title>{course.title} — Eyebuckz Academy</title>
        <meta name="description" content={courseDescription} />
        <meta property="og:title" content={`${course.title} — Eyebuckz Academy`} />
        <meta property="og:description" content={courseDescription} />
        {course.thumbnail && <meta property="og:image" content={course.thumbnail} />}
        <meta property="og:type" content="product" />
      </Helmet>
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
                 {course.rating && <Badge variant="warning" className="shadow-lg"><Star size={12} fill="currentColor"/> {course.rating}</Badge>}
                 <span className="bg-white/20 backdrop-blur text-white px-3 py-0.5 rounded text-xs font-bold border border-white/20">{course.type}</span>
              </div>
              <h1 className="text-3xl md:text-6xl font-bold text-white mb-3 leading-tight">{course.title}</h1>
              <p className="text-sm md:text-xl text-gray-200 hidden md:block">By Eyebuckz Academy</p>
           </div>
           <div className="flex items-center gap-2">
             <WishlistButton courseId={course.id} size={22} className="bg-white/10 p-3 rounded-full hover:bg-white/20 backdrop-blur-md border border-white/10 text-white" />
             <button
               onClick={() => setIsMuted(!isMuted)}
               aria-label={isMuted ? 'Unmute trailer' : 'Mute trailer'}
               className="bg-white/10 p-3 rounded-full hover:bg-white/20 backdrop-blur-md transition text-white border border-white/10"
             >
               {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
             </button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
            
          {/* Tabs Navigation */}
          <div className="flex border-b t-border mb-8 overflow-x-auto no-scrollbar">
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
                        : 'border-transparent t-text-2 hover:t-text'
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
                    <h2 className="text-2xl font-bold t-text">Course Overview</h2>
                    <p className="t-text-2 leading-relaxed text-lg">
                    {course.description}. Designed for visual storytellers who want to master the craft. We cover everything from pre-production planning to post-production delivery.
                    </p>
                    
                    <h3 className="text-xl font-bold t-text mt-8 mb-4">What you'll learn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {course.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-3 t-text-2">
                                <Zap size={18} className="text-brand-600 mt-1 flex-shrink-0" />
                                <span>{feat}</span>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Enroll Button (Main CTA) */}
                    <div className="mt-8 lg:hidden">
                       <Button
                          ref={mainCtaRef}
                          onClick={handleCTA}
                          disabled={ctaConfig.disabled}
                          variant="primary"
                          size="lg"
                          fullWidth
                          rightIcon={ctaConfig.icon}
                        >
                          {hasAccess ? ctaConfig.text : `${ctaConfig.text} • ₹${(course.price / 100).toLocaleString()}`}
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === 'CURRICULUM' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold t-text">Course Content</h2>
                        <span className="t-text-2 text-sm">{(course.chapters?.length || 0)} Chapters</span>
                    </div>
                    {(course.chapters || []).map((chapter, index) => (
                        <div key={chapter.id} className="border t-border rounded-xl t-bg-alt overflow-hidden">
                            <button
                            onClick={() => setOpenChapter(openChapter === chapter.id ? null : chapter.id)}
                            className="w-full flex items-center justify-between p-5 hover:bg-[var(--surface-hover)] transition"
                            >
                            <div className="flex items-center gap-4">
                                <span className="t-text-2 font-mono font-bold">0{index + 1}</span>
                                <span className="font-bold t-text text-left">{chapter.title}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm t-text-2">{chapter.duration}</span>
                                {openChapter === chapter.id ? <ChevronUp size={20} className="text-brand-600" /> : <ChevronDown size={20} className="t-text-2" />}
                            </div>
                            </button>
                            {openChapter === chapter.id && (
                            <div className="p-4 t-bg border-t t-border">
                              {hasAccess ? (
                                <div className="text-sm t-text-2 flex items-center gap-2">
                                  <Play size={14} className="text-brand-400" />
                                  <Link to={`/learn/${course.id}`} className="text-brand-400 hover:text-brand-300 font-medium">Continue to course</Link>
                                </div>
                              ) : (
                                <div className="text-sm t-text-2 flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-2"><Lock size={14} /> {chapter.duration} of content • Enroll to unlock</span>
                                </div>
                              )}
                            </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'COURSES' && course.type === CourseType.BUNDLE && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold t-text">What's Included</h2>
                        <span className="t-text-2 text-sm">{course.bundledCourses?.length || 0} Courses</span>
                    </div>
                    <p className="t-text-2 text-sm mb-6">This bundle includes full access to the following courses:</p>
                    <div className="space-y-4">
                        {(course.bundledCourses || []).map((bc, index) => (
                            <div
                                key={bc.id}
                                onClick={() => navigate(`/course/${bc.id}`)}
                                className="flex gap-4 p-4 border t-border rounded-xl hover:border-brand-500/30 hover:shadow-md transition cursor-pointer group t-bg"
                            >
                                <div className="w-24 h-24 md:w-32 md:h-20 rounded-lg overflow-hidden flex-shrink-0 t-bg-alt">
                                    {bc.thumbnail ? (
                                        <img src={bc.thumbnail} alt={bc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center t-text-2">
                                            <BookOpen size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold t-text-2">COURSE {index + 1}</span>
                                        {bc.rating && (
                                            <div className="flex items-center gap-1 text-xs t-status-warning px-1.5 py-0.5 rounded">
                                                <Star size={10} fill="currentColor" />
                                                {bc.rating}
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-bold t-text group-hover:text-brand-600 transition-colors truncate">{bc.title}</h4>
                                    <p className="text-sm t-text-2 line-clamp-1 mt-1">{bc.description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs t-text-2">
                                        <span className="flex items-center gap-1"><Layers size={12} /> {bc.moduleCount} Lessons</span>
                                        <span className="flex items-center gap-1"><User size={12} /> {bc.totalStudents} Students</span>
                                        {bc.price > 0 && <span className="line-through">₹{(bc.price / 100).toLocaleString()}</span>}
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center t-text-2 group-hover:text-brand-600 transition-colors">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {course.bundledCourses && course.bundledCourses.length > 0 && (() => {
                        const savings = course.bundledCourses.reduce((sum, c) => sum + c.price, 0) - course.price;
                        return savings > 0 ? (
                            <div className="t-status-success border rounded-xl p-4 mt-6">
                                <p className="text-sm font-medium flex items-center gap-2">
                                    <Zap size={16} />
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
          <div className="sticky top-24 t-card border t-border rounded-2xl p-6 shadow-xl shadow-black/10">
            {!hasAccess && (
              <>
                <h3 className="text-4xl font-bold t-text mb-2">₹{(course.price / 100).toLocaleString()}</h3>
                <p className="t-text-2 text-sm mb-8">One-time payment. Lifetime access.</p>
              </>
            )}
            {hasAccess && (
              <div className="t-status-success border rounded-xl p-4 mb-6">
                <p className="font-bold text-sm flex items-center gap-2">
                  <Zap size={16} />
                  You're enrolled in this course
                </p>
              </div>
            )}

            <Button
              onClick={handleCTA}
              disabled={ctaConfig.disabled}
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={ctaConfig.icon}
              className="mb-4 hover:-translate-y-1"
            >
              {ctaConfig.text}
            </Button>
            
            {course.type === CourseType.BUNDLE && course.bundledCourses && course.bundledCourses.length > 0 && (
              <div className="mt-6 border-t t-border pt-6">
                <h4 className="text-sm font-bold t-text mb-3 flex items-center gap-2">
                  <Layers size={16} className="text-brand-600" /> Includes {course.bundledCourses.length} Courses
                </h4>
                <div className="space-y-2">
                  {course.bundledCourses.map((bc) => (
                    <div key={bc.id} className="flex items-center gap-2 text-sm t-text-2">
                      <BookOpen size={14} className="text-brand-500 flex-shrink-0" />
                      <span className="truncate">{bc.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <WishlistButton courseId={course.id} className="flex-1 t-card t-border border py-2 rounded-lg justify-center hover:border-brand-500/50 t-text-2" />
              <ShareButton
                title={course.title}
                text={`Check out ${course.title} on Eyebuckz`}
                className="flex-1 t-card t-border border py-2 rounded-lg justify-center hover:border-brand-500/50 t-text-2"
              />
            </div>

            <div className="space-y-4 mt-8 border-t t-border pt-6">
                <div className="flex items-center gap-3 text-sm t-text-2">
                    <User size={18} className="text-brand-600" />
                    <span>Beginner to Advanced</span>
                </div>
                <div className="flex items-center gap-3 text-sm t-text-2">
                    <Zap size={18} className="text-brand-600" />
                    <span>Instant Access</span>
                </div>
                 <div className="flex items-center gap-3 text-sm t-text-2">
                    <Lock size={18} className="text-brand-600" />
                    <span>Secure Payment</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Buy Button (Conditionally Rendered) */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 t-card border-t t-border lg:hidden z-40 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.15)] safe-pb transition-transform duration-300 ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}>
        {!hasAccess ? (
          <>
            <div>
              <p className="text-xs t-text-2">Total Price</p>
              <p className="text-xl font-bold t-text">₹{(course.price / 100).toLocaleString()}</p>
            </div>
            <Button
              onClick={handleCTA}
              disabled={ctaConfig.disabled}
              variant="primary"
              size="lg"
            >
              {ctaConfig.text}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleCTA}
            disabled={ctaConfig.disabled}
            variant="primary"
            size="lg"
            fullWidth
            rightIcon={ctaConfig.icon}
          >
            {ctaConfig.text}
          </Button>
        )}
      </div>
    </div>
  );
};