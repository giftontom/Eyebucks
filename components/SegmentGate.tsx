import {
  GraduationCap,
  Briefcase,
  Home,
  UserRound,
  TrendingUp,
  Star,
  Check,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { trackPixelCustom } from '../utils/metaPixel';
import { getStoredSegment, storeSegment } from '../utils/segment';

interface Segment {
  /** Machine key sent to Meta as `segment_key` (snake_case, stable). */
  key: string;
  /** Human label, shown in the UI and sent to Meta as `segment_label`. */
  label: string;
  description: string;
  image: string;
  Icon: LucideIcon;
}

/**
 * The six target-audience segments from the "Which one is you?" poster. `key`
 * values are stable machine identifiers used for Meta audience building — do not
 * rename them once ads reference the audiences.
 */
const SEGMENTS: Segment[] = [
  { key: 'creator_income_student', label: 'College Students', description: 'Dreaming of creator income.', image: '/segments/student_creator.jpg', Icon: GraduationCap },
  { key: 'side_income_professional', label: 'Working Professionals', description: 'Wanting side income.', image: '/segments/professional_creator.jpg', Icon: Briefcase },
  { key: 'home_based_women_entrepreneur', label: 'Home-Based Entrepreneurs', description: 'Building dreams from home.', image: '/segments/home_entrepreneur.jpg', Icon: Home },
  { key: 'graduate_personal_brand', label: 'Fresh Graduates', description: 'Ready to build their brand.', image: '/segments/graduate_brand.jpg', Icon: UserRound },
  { key: 'social_growth_business_owner', label: 'Small Business Owners', description: 'Growing & reaching more on social.', image: '/segments/business_owner.jpg', Icon: TrendingUp },
  { key: 'stuck_aspiring_influencer', label: 'Aspiring Influencers', description: 'Who feel “stuck” & need a push.', image: '/segments/stuck_influencer.jpg', Icon: Star },
];

const TRUST = ['Practical Training', 'Supportive Community', 'Expert Guidance', 'Real Growth'];

/**
 * One-time "Which one is you?" audience-selection gate shown before the site on a
 * visitor's first visit. On Continue it persists the choice (localStorage +
 * cookie) and fires a Meta Pixel `SegmentSelected` custom event so the marketer
 * can build audiences in Meta Events Manager. Returning visitors (choice already
 * stored) never see it. Always rendered dark/cinematic to match the poster,
 * independent of the site's light/dark theme.
 *
 * Mount once inside <BrowserRouter>. Renders nothing when already chosen.
 */
export const SegmentGate: React.FC = () => {
  const location = useLocation();
  // Don't interrupt the admin panel with a marketing gate.
  const suppressed = location.pathname.startsWith('/admin');

  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return !getStoredSegment();
    } catch {
      return false;
    }
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLButtonElement>(null);

  const active = visible && !suppressed;

  // Entrance transition + body scroll lock + focus management + focus trap.
  useEffect(() => {
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setEntered(true));
    const focusTimer = window.setTimeout(() => firstCardRef.current?.focus(), 60);

    // Lightweight focus trap so keyboard users stay within the gate.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active]);

  const selectedSegment = useMemo(
    () => SEGMENTS.find((s) => s.key === selected) ?? null,
    [selected],
  );

  const handleContinue = () => {
    if (!selectedSegment) return;
    storeSegment(selectedSegment.key);
    trackPixelCustom('SegmentSelected', {
      segment_key: selectedSegment.key,
      segment_label: selectedSegment.label,
    });
    // GTM dataLayer push — harmless if no tag manager is installed.
    (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({
      event: 'segment_selected',
      segment_key: selectedSegment.key,
      segment_label: selectedSegment.label,
    });
    setClosing(true);
    window.setTimeout(() => setVisible(false), 320);
  };

  if (!active) return null;

  const shown = entered && !closing;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="segment-gate-title"
      className={`fixed inset-0 z-[9999] overflow-y-auto bg-black text-white transition-opacity duration-300 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Ambient red glows */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-600/20 blur-[140px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-brand-500/15 blur-[150px]" />

      <div
        className={`relative mx-auto flex min-h-full max-w-5xl flex-col px-4 py-8 transition-transform duration-500 motion-reduce:transition-none sm:px-6 sm:py-12 ${shown ? 'translate-y-0' : 'translate-y-3'}`}
      >
        {/* Brand */}
        <div className="mb-6 flex justify-center sm:mb-8">
          <div className="text-center">
            <div className="text-2xl font-black tracking-[0.2em] sm:text-3xl">EYEBUCKZ</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.35em] text-white/60 sm:text-xs">
              CREATOR <span className="text-brand-500">ACADEMY</span>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6 text-center sm:mb-8">
          <h1 id="segment-gate-title" className="text-3xl font-black leading-tight sm:text-5xl">
            Which one is <span className="text-brand-500">you?</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/60 sm:text-base">
            Different dreams. One destination. Pick what fits you best to get started.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {SEGMENTS.map((seg, i) => {
            const isSel = selected === seg.key;
            const Icon = seg.Icon;
            return (
              <button
                key={seg.key}
                ref={i === 0 ? firstCardRef : undefined}
                type="button"
                aria-pressed={isSel}
                onClick={() => setSelected(seg.key)}
                className={`group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transition-none ${
                  isSel ? 'border-brand-500 ring-2 ring-brand-500/60' : 'border-white/10 hover:border-white/25'
                }`}
              >
                <img
                  src={seg.image}
                  alt=""
                  aria-hidden
                  loading="eager"
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none ${
                    isSel ? 'opacity-90' : 'opacity-70'
                  }`}
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/10" />
                {isSel && <div aria-hidden className="absolute inset-0 bg-brand-600/15" />}

                {/* Selected checkmark */}
                <div
                  className={`absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                    isSel
                      ? 'border-transparent bg-brand-600 text-white shadow-[0_0_12px_rgba(180,30,35,0.7)]'
                      : 'border-white/30 bg-black/30 text-transparent'
                  }`}
                >
                  <Check size={13} aria-hidden />
                </div>

                {/* Content */}
                <div className="relative z-10 p-3 sm:p-4">
                  <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/90 text-white sm:h-9 sm:w-9">
                    <Icon size={16} aria-hidden />
                  </span>
                  <h3 className="text-sm font-bold leading-snug drop-shadow sm:text-base">{seg.label}</h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/70 sm:text-xs">{seg.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selected}
            className="group inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
          >
            {selectedSegment ? `Continue as ${selectedSegment.label}` : 'Select one to continue'}
            <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-1" />
          </button>

          <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-white/45 sm:text-xs">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span aria-hidden className="h-1 w-1 rounded-full bg-brand-500" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
