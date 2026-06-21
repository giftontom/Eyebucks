import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Slide {
  image: string;
  title: string;
}

interface HeroCarouselProps {
  slides?: Slide[];
  interval?: number;
}

const DEFAULT_SLIDES: Slide[] = [
  { image: '/premium_banner_1.webp', title: 'Masterclass Series' },
  { image: '/premium_banner_2.webp', title: 'Expert-Led Courses' },
  { image: '/banner_real_1.webp',    title: 'Behind the Lens' },
  { image: '/banner_real_2.webp',    title: 'Professional Workflow' },
];

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides = DEFAULT_SLIDES, interval = 5000 }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // Scroll trigger: autoplay only runs while the carousel is on screen
  // (touch parity for desktop's pause-on-hover, plus a perf win everywhere).
  const [offscreen, setOffscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setCurrent(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    if (slides.length === 0) return;
    setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || offscreen) {return;}
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [paused, offscreen, next, interval]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { return; }
    const io = new IntersectionObserver(
      ([entry]) => setOffscreen(!entry.isIntersecting),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Guard against empty slides array — prevents NaN from division by zero.
  // Must come after all hooks (rules-of-hooks); the hooks above are safe with empty slides.
  if (!slides || slides.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    // Touch parity for pause-on-hover: hold to pause, release to resume.
    setPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) { next(); } else { prev(); }
    }
    setPaused(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-4xl mx-auto t-bg-alt border t-border rounded-3xl overflow-hidden group"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured courses"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative aspect-[16/9] overflow-hidden" aria-live="polite">
      {/* Slides */}
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
              width={1200}
              height={675}
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : 'auto'}
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="text-white/80 text-sm font-medium bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">{slide.title}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 t-overlay backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
        aria-label={`Go to previous slide (${current + 1} of ${slides.length})`}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 t-overlay backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center text-white opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-brand-500 outline-none"
        aria-label={`Go to next slide (${current + 1} of ${slides.length})`}
      >
        <ChevronRight size={20} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full transition-all ${i === current ? 'bg-white w-6 sm:w-6' : 'bg-white/40 hover:bg-white/60'}`}
            aria-label={`Go to slide ${i + 1} of ${slides.length}`}
          />
        ))}
      </div>
    </div>
  );
};
