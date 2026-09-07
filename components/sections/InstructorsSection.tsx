import React, { useEffect, useRef, useMemo } from 'react';

import { useSiteSection } from '../../context/SiteContentContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { FadeIn } from '../FadeIn';
import { HorizontalGallery } from '../HorizontalGallery';

import type { SiteContentItem } from '../../types';

interface Instructor {
  name: string;
  role: string;
  bio: string;
  photo: string;
}

const DEFAULT_INSTRUCTORS: Instructor[] = [
  {
    name: 'Shahul Ameen',
    role: 'Colorist & Post-Production Lead',
    bio: 'Specialist in DaVinci Resolve node-based workflows. Graded feature films and 100+ commercial projects.',
    photo: '/instructors/shahul.jpg',
  },
  {
    name: 'Shabeeb',
    role: 'Content Creator & Business Mentor',
    bio: 'Full-time creator monetizing YouTube and Instagram. Teaches the business side: brand deals, contracts, and pricing.',
    photo: '/instructors/shabeeb.jpg',
  },
];

interface InstructorsCopy {
  pill: string;
  title: string;
  body: string;
}

const DEFAULT_COPY: InstructorsCopy = {
  pill: 'Meet Your Instructors',
  title: 'Learn From Working Pros.',
  body: 'Not YouTube theorists. These are filmmakers who shoot, grade, and deliver for paying clients every week.',
};

function parseInstructorItem(item: SiteContentItem): Instructor {
  const meta = (item.metadata ?? {}) as Record<string, string>;
  return {
    name: item.title,
    role: meta.role ?? '',
    bio: item.body ?? '',
    photo: meta.photo ?? '',
  };
}

/**
 * Live 24fps timecode readout (HH:MM:SS:FF). Updates the DOM directly so it
 * never re-renders React; only ticks while on screen, and stays static for
 * users who prefer reduced motion.
 */
const Timecode: React.FC = () => {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) { return; }
    const el = ref.current;
    if (!el) { return; }

    let interval: number | undefined;
    let frames = 0;
    const FPS = 24;

    const tick = () => {
      frames += 1;
      const f = frames % FPS;
      const s = Math.floor(frames / FPS) % 60;
      const m = Math.floor(frames / (FPS * 60)) % 60;
      const h = Math.floor(frames / (FPS * 3600)) % 24;
      el.textContent = [h, m, s, f].map(n => String(n).padStart(2, '0')).join(':');
    };
    const start = () => {
      if (interval === undefined) { interval = window.setInterval(tick, 1000 / FPS); }
    };
    const stop = () => {
      if (interval !== undefined) { window.clearInterval(interval); interval = undefined; }
    };

    if (typeof IntersectionObserver === 'undefined') {
      start();
      return stop;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { start(); } else { stop(); } },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => { observer.disconnect(); stop(); };
  }, [prefersReducedMotion]);

  return <span ref={ref} className="tabular-nums">00:00:00:00</span>;
};

const VIEWFINDER_CORNERS = [
  'top-3 left-3 border-t-2 border-l-2',
  'top-3 right-3 border-t-2 border-r-2',
  'bottom-3 left-3 border-b-2 border-l-2',
  'bottom-3 right-3 border-b-2 border-r-2',
];

export const InstructorsSection: React.FC = () => {
  const instructorRows = useSiteSection('instructors');
  const copyRows = useSiteSection('instructors_copy');

  const instructors = useMemo<Instructor[]>(
    () => (instructorRows && instructorRows.length > 0
      ? instructorRows.map(parseInstructorItem)
      : DEFAULT_INSTRUCTORS),
    [instructorRows],
  );

  const copy = useMemo<InstructorsCopy>(() => {
    const item = copyRows?.[0];
    if (!item) { return DEFAULT_COPY; }
    const meta = (item.metadata ?? {}) as Record<string, string>;
    return {
      pill: meta.pill ?? DEFAULT_COPY.pill,
      title: item.title ?? DEFAULT_COPY.title,
      body: item.body ?? DEFAULT_COPY.body,
    };
  }, [copyRows]);

  return (
    // data-scene-dark: the scroll-driven scene grade (useSceneGrade) darkens
    // the whole viewport canvas while this section occupies it.
    <section id="instructors" data-scene-dark className="py-40 t-bg force-dark">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <HorizontalGallery
          count={instructors.length}
          desktopGrid="md:grid-cols-2"
          mobileLayout="stack"
          heading={
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block px-4 py-1.5 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] text-brand-700 dark:text-brand-400 font-bold tracking-widest uppercase text-xs mb-4">
                  {copy.pill}
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold t-text" style={{ fontFamily: 'var(--font-display)' }}>
                  {copy.title}
                </h2>
                <p className="t-text-2 text-lg mt-4 max-w-2xl mx-auto">
                  {copy.body}
                </p>
              </div>
            </FadeIn>
          }
        >
          {instructors.map((inst, i) => (
              <article key={inst.name} data-scene-card className="group t-card t-border border rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/40 hover:shadow-(--shadow-elevated)">
                {/* Monitor feed: portrait grades from muted to full color on hover */}
                <div className="relative aspect-[4/5] overflow-hidden bg-black">
                  <img
                    src={inst.photo}
                    alt={inst.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover grayscale-[40%] group-live:grayscale-0 group-live:scale-[1.06] transition-all duration-700 ease-out motion-reduce:transition-none"
                  />

                  {/* Glare sweep across the lens on hover */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden" aria-hidden="true">
                    <div className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 transition-transform duration-1000 ease-out group-live:translate-x-[400%]" />
                  </div>

                  {/* Viewfinder corner brackets */}
                  {VIEWFINDER_CORNERS.map(pos => (
                    <span
                      key={pos}
                      className={`absolute ${pos} w-5 h-5 border-white/50 transition-colors duration-300 group-live:border-brand-400 pointer-events-none`}
                      aria-hidden="true"
                    />
                  ))}

                  {/* REC indicator */}
                  <span
                    className="absolute top-6 left-6 inline-flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.25em] text-white/90 uppercase"
                    aria-hidden="true"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                    </span>
                    Rec
                  </span>
                </div>

                {/* Monitor OSD strip */}
                <div
                  className="flex items-center justify-between px-4 py-2 bg-black border-y border-white/10 font-mono text-[10px] tracking-[0.2em] text-white/60 uppercase"
                  aria-hidden="true"
                >
                  <span>{`Cam 0${i + 1} · 24 fps`}</span>
                  <Timecode />
                </div>

                {/* Credits */}
                <div className="p-6 flex-1">
                  <h3 className="text-2xl font-bold t-text" style={{ fontFamily: 'var(--font-display)' }}>
                    {inst.name}
                  </h3>
                  <div
                    className="h-0.5 w-8 group-live:w-24 transition-all duration-500 bg-gradient-to-r from-brand-500 to-orange-400 rounded-full mt-2 mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-brand-700 dark:text-brand-400 mb-3">
                    {inst.role}
                  </p>
                  <p className="text-sm t-text-2 leading-relaxed">{inst.bio}</p>
                </div>
              </article>
          ))}
        </HorizontalGallery>
      </div>
    </section>
  );
};
