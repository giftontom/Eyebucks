import { Play, ArrowRight, Sparkles, CheckCircle2, Award } from 'lucide-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSiteSection } from '../../context/SiteContentContext';
import { useScrollParallax } from '../../hooks/useScrollParallax';
import { coursesApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { AnimatedCounter } from '../AnimatedCounter';
import { HeroCarousel } from '../HeroCarousel';

const DEFAULT_COPY = {
  pill: 'New Cohort Starting Soon',
  title: 'Master the Craft',
  headline2: 'of Filmmaking.',
  body: 'Professional courses, raw assets, and a community of working creators. Everything you need to go from beginner to full-time filmmaker.',
  ctaPrimaryGuest: 'Start Learning',
  ctaPrimaryUser: 'Continue Learning',
  ctaSecondary: 'See Courses',
  statCoursesSuffix: '+ Courses',
  stat2: 'Lifetime Access',
  stat3: 'Certificate Included',
};

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [courseCount, setCourseCount] = useState(15);
  const heroRows = useSiteSection('hero');
  const slideRows = useSiteSection('hero_slides');

  const sectionRef = useRef<HTMLElement>(null);
  const parallaxOffset = useScrollParallax(sectionRef, { maxOffset: 40, factor: 0.18 });

  useEffect(() => {
    coursesApi.getCourseCount(language)
      .then(count => { if (count > 0) {setCourseCount(count);} })
      .catch(err => logger.warn('[HeroSection] Failed to load course count:', err));
  }, [language]);

  // Derived during render, not mirrored into state via an effect: an effect
  // runs after the first paint, so the hardcoded DEFAULT_COPY would be visible
  // for a frame (or, before SiteContentProvider batched these, for the whole
  // network round-trip) before the real copy replaced it.
  const copy = useMemo(() => {
    const item = heroRows?.[0];
    if (!item) { return DEFAULT_COPY; }
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    const pick = (v: unknown, fallback: string) =>
      typeof v === 'string' && v.trim() !== '' ? v : fallback;
    return {
      pill: pick(meta.pill, DEFAULT_COPY.pill),
      title: pick(item.title, DEFAULT_COPY.title),
      headline2: pick(meta.headline2, DEFAULT_COPY.headline2),
      body: pick(item.body, DEFAULT_COPY.body),
      ctaPrimaryGuest: pick(meta.ctaPrimaryGuest, DEFAULT_COPY.ctaPrimaryGuest),
      ctaPrimaryUser: pick(meta.ctaPrimaryUser, DEFAULT_COPY.ctaPrimaryUser),
      ctaSecondary: pick(meta.ctaSecondary, DEFAULT_COPY.ctaSecondary),
      statCoursesSuffix: pick(meta.statCoursesSuffix, DEFAULT_COPY.statCoursesSuffix),
      stat2: pick(meta.stat2, DEFAULT_COPY.stat2),
      stat3: pick(meta.stat3, DEFAULT_COPY.stat3),
    };
  }, [heroRows]);

  // Hero carousel slides (one CMS row per slide; metadata.image = poster,
  // optional metadata.video = short muted loop played over it).
  // undefined → HeroCarousel falls back to its own built-in slides.
  const slides = useMemo(() => {
    const mapped = (slideRows ?? [])
      .map((i): { image: string; title: string; video?: string } | null => {
        const meta = (i.metadata as Record<string, unknown> | null) ?? {};
        const img = meta.image;
        if (typeof img !== 'string' || img.trim() === '') { return null; }
        const vid = meta.video;
        const video = typeof vid === 'string' && vid.trim() !== '' ? vid : undefined;
        return { image: img, title: i.title, video };
      })
      .filter((s): s is { image: string; title: string; video?: string } => s !== null);
    return mapped.length > 0 ? mapped : undefined;
  }, [slideRows]);

  const scrollToFeatured = () => {
    const el = document.getElementById('featured-courses');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/courses');
    }
  };

  // Key light follows the cursor across the hero (fine pointers; coarse
  // pointers get the CSS key-drift instead). Direct style writes — no renders.
  const handleKeylight = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') { return; }
    const el = sectionRef.current;
    if (!el) { return; }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) { return; }
    el.style.setProperty('--key-x', `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
    el.style.setProperty('--key-y', `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
  };

  return (
    <section
      id="hero"
      ref={sectionRef}
      onPointerMove={handleKeylight}
      className="hero-stage relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden t-bg pt-28 pb-16 px-4"
    >
      {/* Cursor-tracked key light (scroll-drifted on touch devices) */}
      <div className="hero-keylight" aria-hidden="true" />
      {/* Ambient glow orbs — subtle scroll-linked parallax */}
      <div
        className="absolute top-1/4 left-1/4 w-[280px] h-[280px] sm:w-[500px] sm:h-[500px] bg-brand-600/20 rounded-full blur-[120px] animate-glow-pulse pointer-events-none will-change-transform"
        style={{ transform: `translate3d(0, ${parallaxOffset}px, 0)` }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[220px] h-[220px] sm:w-[400px] sm:h-[400px] bg-orange-500/15 rounded-full blur-[120px] animate-glow-pulse pointer-events-none will-change-transform"
        style={{ transform: `translate3d(0, ${-parallaxOffset * 0.6}px, 0)`, animationDelay: '2s' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] sm:w-[300px] sm:h-[300px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Announcement pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] backdrop-blur-xl text-brand-700 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in-up hover:bg-[rgba(255,59,48,0.15)] transition duration-300 cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
          </span>
          {copy.pill}
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 leading-[0.9] animate-fade-in-up" style={{ fontFamily: 'var(--font-display)' }}>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">
            {copy.title}
          </span>
          <br />
          <span className="t-text">{copy.headline2}</span>
        </h1>

        {/* Subtitle */}
        <p className="t-body-lg md:text-xl t-text-2 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {copy.body}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/courses')}
            data-live
            className="group cta-sheen w-full sm:w-auto h-14 px-10 rounded-full bg-brand-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-[var(--shadow-brand)] hover:shadow-[0_0_60px_-10px_rgba(220,38,38,0.7)] hover:-translate-y-0.5 hover:bg-brand-600"
          >
            {user ? copy.ctaPrimaryUser : copy.ctaPrimaryGuest}
            <ArrowRight size={20} className="group-live:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={scrollToFeatured}
            className="group w-full sm:w-auto h-14 px-10 rounded-full t-card t-border border hover:bg-[var(--surface-hover)] t-text font-bold text-lg flex items-center justify-center gap-3 transition-all backdrop-blur-sm hover:-translate-y-0.5"
          >
            <Play size={18} fill="currentColor" /> {copy.ctaSecondary}
          </button>
        </div>

        {/* Hero Carousel */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <HeroCarousel slides={slides} />
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10 animate-fade-in-up" style={{ animationDelay: '0.5s', opacity: 'var(--scene-dark, 1)' }}>
          <span className="px-5 py-2.5 rounded-full t-card t-border border text-sm font-bold t-text-2 flex items-center gap-2 backdrop-blur-sm">
            <Sparkles size={16} className="text-brand-500" /> <AnimatedCounter value={courseCount} suffix={copy.statCoursesSuffix} />
          </span>
          <span className="px-5 py-2.5 rounded-full t-card t-border border text-sm font-bold t-text-2 flex items-center gap-2 backdrop-blur-sm">
            <CheckCircle2 size={16} className="text-[color:var(--status-success-text)]" /> {copy.stat2}
          </span>
          <span className="px-5 py-2.5 rounded-full t-card t-border border text-sm font-bold t-text-2 flex items-center gap-2 backdrop-blur-sm">
            <Award size={16} className="text-yellow-500" /> {copy.stat3}
          </span>
        </div>
      </div>
    </section>
  );
};
