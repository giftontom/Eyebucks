import { Search, CreditCard, Award, Check } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { FadeIn } from '../FadeIn';

const STEPS = [
  {
    number: '01',
    icon: Search,
    title: 'Browse Courses',
    description: 'Explore our catalog of filmmaking courses — from cinematography basics to advanced color grading. Every course includes real project files and RAW footage.',
  },
  {
    number: '02',
    icon: CreditCard,
    title: 'Enroll & Pay',
    description: 'Secure checkout via Razorpay. Instant access after payment. 30-day money-back guarantee if you\'re not satisfied.',
  },
  {
    number: '03',
    icon: Award,
    title: 'Learn & Get Certified',
    description: 'Watch at your own pace, track progress, and earn a verifiable certificate when you complete a course. Lifetime access to all content.',
  },
];

export const HowItWorksSection: React.FC = () => {
  const [active, setActive] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);

  // Scroll drives the steps: progress 0→1 through the tall track advances the
  // active step (1→2→3) and fills the connector to the next. setActive fires
  // only on a step change (≤2 renders); the intra-step fill is written to a
  // CSS var on the stage each frame (no re-render). Replaces the old 5s timer.
  const onProgress = useCallback((p: number) => {
    const n = STEPS.length;
    const raw = p * n;
    const idx = Math.min(Math.floor(raw), n - 1);
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActive(idx);
    }
    const fill = Math.max(0, Math.min(1, raw - idx));
    stageRef.current?.style.setProperty('--step-fill', String(fill));
  }, []);

  useScrollProgress(trackRef, onProgress, !prefersReducedMotion);

  // Click a step: reduced-motion jumps directly; pinned mode scrolls the page
  // to that step's slice of the track so the pin scrubs to it.
  const goToStep = (i: number) => {
    if (prefersReducedMotion || !trackRef.current) {
      setActive(i);
      return;
    }
    const r = trackRef.current.getBoundingClientRect();
    const span = r.height - (window.innerHeight || 1);
    const target = window.scrollY + r.top + ((i + 0.5) / STEPS.length) * span;
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  const step = STEPS[active];
  const ActiveIcon = step.icon;

  const inner = (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <FadeIn>
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] text-brand-700 dark:text-brand-400 font-bold tracking-widest uppercase text-xs mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold t-text" style={{ fontFamily: 'var(--font-display)' }}>
            Your Path to Pro Filmmaker.
          </h2>
          <p className="t-text-2 text-lg mt-4 max-w-2xl mx-auto">
            Three simple steps from where you are now to where you want to be.
          </p>
        </div>
      </FadeIn>

      {/* Pipeline rail */}
      <div className="flex items-center max-w-2xl mx-auto mb-10" role="tablist" aria-label="How it works steps">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const isDone = i < active;
          const isActive = i === active;
          return (
            <React.Fragment key={s.number}>
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Step ${s.number}: ${s.title}`}
                onClick={() => goToStep(i)}
                className={`relative shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-brand-500 border-brand-500 text-white shadow-[var(--shadow-brand)] scale-110'
                    : isDone
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-500'
                      : 't-card t-border t-text-3 hover:border-brand-500/40 hover:text-brand-500'
                }`}
              >
                {isDone ? <Check size={18} /> : <StepIcon size={18} />}
              </button>

              {i < STEPS.length - 1 && (
                <div className="relative flex-1 h-1 mx-2 md:mx-3 rounded-full bg-[var(--border)] overflow-hidden">
                  {i < active && (
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-orange-400" />
                  )}
                  {i === active && !prefersReducedMotion && (
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-orange-400"
                      style={{ width: 'calc(var(--step-fill, 0) * 100%)' }}
                    />
                  )}
                  {i === active && prefersReducedMotion && (
                    <div className="absolute inset-0 bg-brand-500/25" />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active step detail */}
      <div
        key={active}
        role="tabpanel"
        className="motion-safe:animate-fade-in-up relative max-w-3xl mx-auto t-card t-border border rounded-3xl p-8 md:p-10 overflow-hidden min-h-[220px] sm:min-h-[180px]"
      >
        <span
          aria-hidden="true"
          className="absolute -top-8 -right-2 text-[10rem] font-black leading-none pointer-events-none select-none text-brand-500/8"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {step.number}
        </span>

        <div className="relative flex flex-col sm:flex-row items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
            <ActiveIcon size={26} />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.18em] uppercase text-brand-700 dark:text-brand-400 mb-1.5">
              Step {step.number} / 03
            </p>
            <h3 className="text-2xl font-bold t-text mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              {step.title}
            </h3>
            <p className="t-text-2 leading-relaxed">{step.description}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Reduced motion: normal section, manual tap-through pipeline (no pin/scroll-jack).
  if (prefersReducedMotion) {
    return <section className="py-24 t-bg">{inner}</section>;
  }

  // Pinned scroll-jack: tall track + sticky stage; scroll scrubs the steps.
  return (
    <section className="t-bg">
      <div
        ref={trackRef}
        className="pin-track relative"
        style={{ ['--track-h' as string]: `${100 + STEPS.length * 70}vh` }}
      >
        <div
          ref={stageRef}
          className="flex flex-col justify-center sticky top-[var(--nav-h)] h-[calc(100svh-var(--nav-h)-var(--bottom-nav-height,0px))]"
        >
          {inner}
        </div>
      </div>
    </section>
  );
};
