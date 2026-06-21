import { Star, MessageCircle, Users, Video, Zap, ArrowRight, Quote } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { siteContentApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { AnimatedCounter } from '../AnimatedCounter';
import { FadeIn, STAGGER_MS } from '../FadeIn';

import type { SiteContentItem } from '../../types';

interface Testimonial {
  name: string;
  course: string;
  rating: number;
  quote: string;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { name: 'Rahul M.', course: 'Cinematography Masterclass', rating: 5, quote: 'Went from shooting auto-mode on a phone to landing paid music video gigs in 4 months. The RAW footage practice alone is worth 10x the price.' },
  { name: 'Priya K.', course: 'Color Grading Pro', rating: 5, quote: 'I was stuck using basic LUTs for years. The node-based grading workflow changed everything — my client work looks like a Hollywood film now.' },
  { name: 'Arjun S.', course: 'Filmmaking Bundle', rating: 5, quote: 'The business module alone helped me raise my day rate by 40%. Contracts, client management, pricing — stuff nobody else teaches.' },
];

const COMMUNITY_STATS = [
  { icon: Users, value: 2500, suffix: '+', label: 'Active Members' },
  { icon: MessageCircle, value: 12, suffix: 'k+', label: 'Messages / Month' },
  { icon: Video, value: 500, suffix: '+', label: 'Work Reviews' },
  { icon: Zap, value: 24, suffix: 'h', label: 'Avg Response' },
];

function parseTestimonialItem(item: SiteContentItem): Testimonial {
  const meta = (item.metadata ?? {}) as Record<string, string>;
  return {
    name: item.title,
    course: meta.course ?? '',
    rating: Number(meta.rating) || 5,
    quote: item.body ?? '',
  };
}

function avatarFallback(name: string): string {
  return name.charAt(0).toUpperCase();
}

/** Poster-acclaim star row. `size` controls the glyph. */
function StarRow({ rating, size = 16, className = '' }: { rating: number; size?: number; className?: string }) {
  return (
    <div className={`flex gap-1 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rating ? 'text-yellow-400 fill-yellow-400' : 't-text-3'}
        />
      ))}
    </div>
  );
}

/** Compact supporting review for the right rail. */
function SupportingCard({ t }: { t: Testimonial }) {
  return (
    <figure className="group t-card t-border border rounded-2xl p-6 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-(--shadow-elevated)">
      <StarRow rating={t.rating} size={14} className="mb-3" />
      <blockquote className="t-body t-text-2 leading-relaxed flex-1">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="flex items-center gap-3 mt-5 pt-4 border-t border-dashed t-border">
        <div className="w-9 h-9 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-500 font-bold text-sm shrink-0">
          {avatarFallback(t.name)}
        </div>
        <div className="min-w-0">
          <p className="font-bold t-text text-sm truncate">{t.name}</p>
          <p className="t-caption truncate">{t.course}</p>
        </div>
      </figcaption>
    </figure>
  );
}

export const CommunityProofSection: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);

  useEffect(() => {
    siteContentApi.getBySection('testimonial')
      .then(items => {
        if (items.length > 0) {setTestimonials(items.map(parseTestimonialItem));}
      })
      .catch(err => logger.warn('[CommunityProofSection] Failed to load from CMS:', err));
  }, []);

  const featured = testimonials[0];
  const supporting = testimonials.slice(1, 3);

  return (
    <section className="py-20 md:py-28 t-bg-alt">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — scene-adaptive: this section flanks the dark Instructors
            island above it, so its on-canvas text flips light while the scene
            grade is still dark, then back to ink as the canvas lightens. */}
        <FadeIn>
          <div className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] scene-adaptive-brand font-bold tracking-widest uppercase text-xs mb-4">
              Real Students. Real Results.
            </span>
            <h2 className="t-h2 scene-adaptive-text mb-4">You won't learn alone.</h2>
            <p className="t-body-lg scene-adaptive-text-2">
              A private community of working creators — feedback every week, real paid gigs, and people who'll push you forward.
            </p>
          </div>
        </FadeIn>

        {/* Editorial spotlight: one large featured review + two compact ones */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          {featured && (
            <FadeIn className="h-full">
              <figure className="group relative h-full t-card t-border border rounded-3xl p-8 md:p-10 flex flex-col overflow-hidden transition-all duration-300 hover:border-brand-500/30 hover:shadow-(--shadow-elevated)">
                {/* Ghost quote mark + soft brand glow */}
                <Quote
                  size={120}
                  className="absolute -top-4 -left-3 text-brand-500/[0.07] fill-brand-500/[0.07] pointer-events-none"
                  aria-hidden="true"
                />
                <div
                  className="absolute -bottom-20 -right-16 w-[280px] h-[280px] bg-brand-500/[0.07] rounded-full blur-[90px] pointer-events-none"
                  aria-hidden="true"
                />
                <StarRow rating={featured.rating} size={22} className="relative mb-6" />
                <blockquote
                  className="relative text-xl md:text-2xl lg:text-[1.75rem] leading-snug t-text font-medium flex-1 text-balance"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  &ldquo;{featured.quote}&rdquo;
                </blockquote>
                <figcaption className="relative flex items-center gap-4 mt-8 pt-6 border-t t-border">
                  <div className="w-14 h-14 rounded-full bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-500 font-black text-xl shrink-0">
                    {avatarFallback(featured.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold t-text">{featured.name}</p>
                    <p className="t-caption">{featured.course}</p>
                  </div>
                  <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full t-status-success border text-[10px] font-bold uppercase tracking-wider shrink-0">
                    Verified student
                  </span>
                </figcaption>
              </figure>
            </FadeIn>
          )}

          {supporting.length > 0 && (
            <div className="flex flex-col gap-6">
              {supporting.map((t, i) => (
                <FadeIn key={`${t.name}-${i}`} delay={(i + 1) * STAGGER_MS} className="h-full">
                  <SupportingCard t={t} />
                </FadeIn>
              ))}
            </div>
          )}
        </div>

        {/* Community strip: counting stats + Discord CTA */}
        <FadeIn delay={3 * STAGGER_MS}>
          <div className="relative overflow-hidden t-card t-border border rounded-2xl mt-12 p-8 md:p-10">
            <div
              className="absolute -top-24 -right-10 w-[300px] h-[300px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                {COMMUNITY_STATS.map(stat => (
                  <div key={stat.label} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 shrink-0">
                      <stat.icon size={18} />
                    </div>
                    <div>
                      <p className="text-2xl md:text-3xl font-black t-text leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </p>
                      <p className="t-caption mt-1">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:border-l t-border lg:pl-10">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] text-brand-700 dark:text-brand-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                  </span>
                  Live community
                </span>
                <h3 className="t-h3 t-text mb-2">Join the Discord</h3>
                <p className="t-body t-text-2 mb-6">
                  Weekly work reviews, live Q&A with working filmmakers, and a job board that's already changed careers.
                </p>
                <a
                  href="https://discord.gg/eyebuckz"
                  target="_blank"
                  rel="noreferrer"
                  data-live
                  className="group cta-sheen inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold transition-all shadow-[var(--shadow-brand)] hover:-translate-y-0.5"
                >
                  <MessageCircle size={18} />
                  Join the community
                  <ArrowRight size={16} className="group-live:translate-x-1 transition-transform" />
                </a>
                <p className="t-caption mt-3">Free with any course enrollment.</p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
