import { Play, ChevronDown, ChevronUp, Lock, Zap, Star, ArrowRight, Loader2, Layers, Award, Clock, Infinity as InfinityIcon, Smartphone } from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { Button, JsonLd, Thumbnail, TrustBadges } from '../components';
import { ReviewList } from '../components/ReviewList';
import { useAuth } from '../context/AuthContext';
import { useAccessControl } from '../hooks/useAccessControl';
import { useVideoUrl } from '../hooks/useVideoUrl';
import { coursesApi, checkoutApi } from '../services/api';
import { CourseType } from '../types';
import { analytics } from '../utils/analytics';
import { formatPrice, showsComparePrice } from '../utils/format';

import { CourseDetailsHero } from './course-details/CourseDetailsHero';
import { CourseDetailsSidebar } from './course-details/CourseDetailsSidebar';

import type { Course } from '../types';

export const CourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
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

  // Fetch related courses when the main course loads — same language as the course being viewed.
  useEffect(() => {
    if (!course) return;
    coursesApi.getCourses({ page: 1, pageSize: 4, language: course.language })
      .then(res => {
        setRelatedCourses(res.courses.filter(c => c.id !== course.id).slice(0, 3));
      })
      .catch(() => { /* silent — related courses are non-critical */ });
  }, [course]);

  // Request the anonymous public-trailer signing path so the hero plays for
  // logged-out storefront visitors (not just enrolled users/admins).
  const { hlsUrl: heroVideoSrc } = useVideoUrl(course?.heroVideoId, null, '', 'trailer');
  const [isMuted, setIsMuted] = useState(true);
  // Entitlement-based upgrade quote (module owner → bundle): "you've already paid X".
  const [upgradeQuote, setUpgradeQuote] = useState<{ creditPaise: number; finalPrice: number } | null>(null);
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CURRICULUM' | 'COURSES' | 'REVIEWS'>('OVERVIEW');
  const [showSticky, setShowSticky] = useState(false);

  // Fetch the upgrade quote for a bundle the (logged-in) user doesn't yet own.
  useEffect(() => {
    if (!user || !course || hasAccess || course.type !== CourseType.BUNDLE) {
      setUpgradeQuote(null);
      return;
    }
    let cancelled = false;
    checkoutApi.getUpgradeQuote(course.id)
      .then(q => {
        if (cancelled) { return; }
        if (q.reason === 'UPGRADE' && q.finalPrice !== null) {
          setUpgradeQuote({ creditPaise: q.creditPaise, finalPrice: q.finalPrice });
        } else {
          setUpgradeQuote(null);
        }
      })
      .catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
  }, [user, course, hasAccess]);

  // Observe the main Call-to-Action button to decide when the sticky bar shows.
  // This must be a *callback* ref: the button only mounts after the course has
  // loaded (the component early-returns a spinner while `isLoadingCourse`), and
  // it unmounts whenever the visitor leaves the OVERVIEW tab. A `useRef` +
  // mount-only effect observed nothing at all, leaving the bar permanently
  // stuck in its hidden state — a callback ref re-runs on every mount/unmount.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mainCtaRef = useCallback((node: HTMLButtonElement | null) => {
    observerRef.current?.disconnect();
    if (!node) {
      // No CTA on screen (non-OVERVIEW tab) → the sticky bar is the only
      // enroll surface, so show it.
      setShowSticky(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky footer when the main CTA is NOT visible
        setShowSticky(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-100px 0px 0px 0px', // Offset slightly so it triggers before it's completely gone
      },
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  // Reserve room under the page (and the shared footer, via `pb-bottom-nav`)
  // for the mobile sticky enroll bar that stacks on top of the bottom nav.
  // index.css turns this into `--sticky-cta-height` below the lg breakpoint.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.stickyCta = 'true';
    return () => { delete root.dataset.stickyCta; };
  }, []);

  const courseSchema = useMemo(() => {
    if (!course) return null;
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.title,
      description: course.description,
      provider: {
        '@type': 'Organization',
        name: 'Eyebuckz Academy',
        sameAs: 'https://eyebuckz.com',
      },
      offers: {
        '@type': 'Offer',
        price: (course.price / 100).toFixed(2),
        priceCurrency: 'INR',
      },
    };
    if (course.thumbnail) schema.image = course.thumbnail;
    if (course.rating && course.totalStudents) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: course.rating,
        ratingCount: course.totalStudents,
      };
    }
    return schema;
  }, [course]);

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
      {courseSchema && <JsonLd data={courseSchema} />}
      <CourseDetailsHero
        course={course}
        heroVideoSrc={heroVideoSrc}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
      />

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
                    {course.description}
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

                    {/* This course includes */}
                    <div className="mt-10 p-6 rounded-2xl t-card t-border border">
                        <h3 className="text-lg font-bold t-text mb-4">This course includes</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                            {[
                                course.type === CourseType.BUNDLE
                                    ? { icon: <Layers size={18} />, text: `${course.bundledCourses?.length || 0} full courses included` }
                                    : { icon: <Play size={18} />, text: `${course.chapters?.length || 0} on-demand lessons` },
                                { icon: <InfinityIcon size={18} />, text: 'Full lifetime access' },
                                { icon: <Smartphone size={18} />, text: 'Access on mobile & desktop' },
                                { icon: <Award size={18} />, text: 'Certificate of completion' },
                                { icon: <Clock size={18} />, text: 'Learn at your own pace' },
                                { icon: <Star size={18} />, text: 'Community & support access' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 t-text-2">
                                    <span className="text-brand-500 shrink-0">{item.icon}</span>
                                    <span className="text-sm">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Enroll Button (Main CTA) */}
                    <div className="mt-8 lg:hidden space-y-4">
                       <Button
                          ref={mainCtaRef}
                          onClick={handleCTA}
                          disabled={ctaConfig.disabled}
                          variant="primary"
                          size="lg"
                          fullWidth
                          rightIcon={ctaConfig.icon}
                        >
                          {hasAccess ? ctaConfig.text : `${ctaConfig.text} • ${formatPrice(course.price)}`}
                        </Button>
                        {!hasAccess && <TrustBadges variant="grid" />}
                    </div>
                </div>
            )}

            {activeTab === 'CURRICULUM' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold t-text">Course Content</h2>
                        <span className="t-text-2 text-sm">
                          {(course.chapters?.length || 0)} Chapters · {(course.chapters || []).reduce((sum, ch) => sum + ch.lessons.length, 0)} Lessons
                        </span>
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
                                <span className="text-sm t-text-2">{chapter.lessons.length} lesson{chapter.lessons.length !== 1 ? 's' : ''}</span>
                                {openChapter === chapter.id ? <ChevronUp size={20} className="text-brand-600" /> : <ChevronDown size={20} className="t-text-2" />}
                            </div>
                            </button>
                            {openChapter === chapter.id && (
                            <div className="t-bg border-t t-border divide-y t-border">
                              {chapter.lessons.map((lesson) => (
                                <div key={lesson.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                                  <span className="flex items-center gap-2 t-text-2 min-w-0">
                                    {hasAccess || lesson.isFreePreview
                                      ? <Play size={14} className="text-brand-400 flex-shrink-0" />
                                      : <Lock size={14} className="flex-shrink-0" />}
                                    <span className="truncate">{lesson.title}</span>
                                    {lesson.isFreePreview && (
                                      <span className="text-[10px] uppercase font-bold tracking-wider text-brand-400 flex-shrink-0">Free</span>
                                    )}
                                  </span>
                                  <span className="t-text-3 font-mono text-xs flex-shrink-0">{lesson.duration}</span>
                                </div>
                              ))}
                              {chapter.lessons.length === 0 && (
                                <p className="p-4 text-sm t-text-3">No lessons in this chapter yet.</p>
                              )}
                              {hasAccess && chapter.lessons.length > 0 && (
                                <div className="p-4">
                                  <Link to={`/learn/${course.id}`} className="text-brand-400 hover:text-brand-300 font-medium text-sm inline-flex items-center gap-2">
                                    <Play size={14} /> Continue to course
                                  </Link>
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
                                <div className="w-28 md:w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0 t-bg-alt">
                                    <Thumbnail src={bc.thumbnail} alt={bc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                                        <span className="flex items-center gap-1"><Layers size={12} /> {bc.lessonCount} Lessons</span>
                                        {bc.price > 0 && <span className="line-through">{formatPrice(bc.price)}</span>}
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
                                    Save {formatPrice(savings)} compared to buying individually
                                </p>
                            </div>
                        ) : null;
                    })()}

                    {course.bundledAssets && course.bundledAssets.length > 0 && (
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold t-text">Included Digital Assets</h3>
                                <span className="t-text-2 text-sm">{course.bundledAssets.length} {course.bundledAssets.length === 1 ? 'Asset' : 'Assets'}</span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {course.bundledAssets.map((asset) => (
                                    <div key={asset.id} className="flex gap-3 p-3 border t-border rounded-xl t-bg items-center">
                                        <div className="w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 t-bg-alt">
                                            <Thumbnail src={asset.thumbnail} alt={asset.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wide t-status-info px-1.5 py-0.5 rounded">{asset.fileType}</span>
                                                <span className="text-[10px] uppercase t-text-3">{asset.license}</span>
                                            </div>
                                            <h4 className="font-semibold t-text truncate">{asset.title}</h4>
                                            {asset.price > 0 && <span className="text-xs t-text-2 line-through">{formatPrice(asset.price)}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
          <CourseDetailsSidebar
            course={course}
            hasAccess={hasAccess}
            ctaConfig={ctaConfig}
            onCta={handleCTA}
            upgradeQuote={upgradeQuote}
          />
        </div>
      </div>

      {/* Related Courses */}
      {relatedCourses.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <h2 className="text-2xl font-bold t-text mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedCourses.map(c => (
              <Link key={c.id} to={`/course/${c.id}`} className="group t-card rounded-2xl overflow-hidden t-border border hover:border-brand-500/30 transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-video t-bg-alt overflow-hidden">
                  <Thumbnail src={c.thumbnail} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 text-xs t-text-2 mb-2">
                    {c.rating && (
                      <span className="flex items-center gap-1"><Star size={12} style={{ color: 'var(--color-rating-star)' }} fill="currentColor" />{c.rating}</span>
                    )}
                    <span>{c.type === CourseType.BUNDLE ? `${c.bundledCourses?.length || 0} Courses` : `${c.chapters?.length || 0} Lessons`}</span>
                  </div>
                  <h3 className="font-bold t-text group-hover:text-brand-600 transition-colors mb-1 truncate">{c.title}</h3>
                  <p className="text-sm t-text-2 line-clamp-2 mb-3">{c.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold t-text">{formatPrice(c.price)}</span>
                    <span className="text-brand-600 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">View Course <ArrowRight size={14} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sticky Buy Button (Conditionally Rendered).
          `translate-y-full` alone does NOT hide this: it moves the bar down by
          only its own height, which parks it exactly over the bottom nav — and
          the nav is only 90% opaque, so the price and "Enroll Now" ghosted
          through the frosted glass. `translate-y-clear-nav` also clears the nav
          height + safe-area inset so the bar genuinely leaves the viewport;
          `md:translate-y-full` resets that above the breakpoint where the nav is
          hidden and the bar sits at bottom-0. Fade it out and take it out of the
          hit-testing and a11y trees too (`inert` also drops it from the tab
          order, which `aria-hidden` alone would not). */}
      <div
        aria-hidden={!showSticky}
        inert={!showSticky}
        className={`fixed bottom-nav-offset md:bottom-0 left-0 right-0 p-4 t-card border-t t-border lg:hidden z-40 flex items-center justify-between gap-4 shadow-lg shadow-black/5 dark:shadow-none transition-[translate,opacity] duration-300 motion-reduce:transition-none ${
          showSticky
            ? 'translate-y-0 opacity-100'
            : 'translate-y-clear-nav md:translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {!hasAccess ? (
          <>
            <div>
              <p className="text-xs t-text-2">Total Price</p>
              <p className="text-xl font-bold t-text">
                {formatPrice(course.price)}
                {showsComparePrice(course.price, course.comparePrice) && (
                  <span className="ml-2 text-sm font-normal t-text-3 line-through">
                    {formatPrice(course.comparePrice)}
                  </span>
                )}
              </p>
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