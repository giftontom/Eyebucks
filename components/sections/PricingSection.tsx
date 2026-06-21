import { ArrowRight, Award, Check, ShieldCheck, Zap } from 'lucide-react';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { coursesApi } from '../../services/api';
import { formatPrice } from '../../utils/format';
import { logger } from '../../utils/logger';
import { Button } from '../Button';
import { FadeIn, STAGGER_MS } from '../FadeIn';
import { HorizontalGallery } from '../HorizontalGallery';

interface PricingTier {
  title: string;
  subtitle: string;
  price: number;
  originalPrice: number;
  features: string[];
  cta: string;
  highlighted: boolean;
}

// Fallback tiers used when DB prices can't be loaded
const FALLBACK_TIERS: PricingTier[] = [
  {
    title: 'Individual Course',
    subtitle: 'Single course, lifetime access',
    price: 49900,
    originalPrice: 74900,
    features: ['Full course curriculum', 'Downloadable assets & RAW footage', 'Certificate of completion', 'Lifetime access', 'Community Discord'],
    cta: 'Browse Courses',
    highlighted: false,
  },
  {
    title: 'Bundle',
    subtitle: 'Multiple courses at a discount',
    price: 99900,
    originalPrice: 199900,
    features: ['3–5 curated courses', 'All individual course benefits', 'Bonus business modules', 'Priority community feedback', 'Bundle-exclusive assets'],
    cta: 'View Bundles',
    highlighted: true,
  },
];

const NOTCH_RADIUS = 12;

/**
 * Mask that punches a real semicircular notch into each side of the ticket at
 * the tear line (`--notch-y`, measured at runtime). Everything in the hole —
 * surface, border, gradients — becomes genuinely transparent, so the page
 * background shows through and no border line crosses the cut.
 * Two half-width layers (additive) avoid needing mask-composite support.
 */
const notchGradient = (x: string) =>
  `radial-gradient(circle ${NOTCH_RADIUS}px at ${x} var(--notch-y, 50%), transparent ${NOTCH_RADIUS - 0.5}px, #000 ${NOTCH_RADIUS}px)`;
const TICKET_MASK_IMAGE = `${notchGradient('0')}, ${notchGradient('100%')}`;
const ticketMaskStyle: React.CSSProperties = {
  maskImage: TICKET_MASK_IMAGE,
  maskSize: '51% 100%',
  maskPosition: 'left top, right top',
  maskRepeat: 'no-repeat',
  WebkitMaskImage: TICKET_MASK_IMAGE,
  WebkitMaskSize: '51% 100%',
  WebkitMaskPosition: 'left top, right top',
  WebkitMaskRepeat: 'no-repeat',
};

/**
 * Dashed tear-line between the price block and the stub. The savings pill sits
 * on the line like a stamp — a fixed home for it on every card, so long prices
 * can't wrap it and the tear lines stay level across cards.
 */
const TicketPerforation = React.forwardRef<HTMLDivElement, { label?: string }>(({ label }, ref) => (
  <div ref={ref} className="relative -mx-8 px-6 my-6 flex items-center gap-3">
    <div className="flex-1 border-t-2 border-dashed border-slate-400/40" aria-hidden="true" />
    {label && (
      <span className="shrink-0 t-status-success border rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide">
        {label}
      </span>
    )}
    <div className="flex-1 border-t-2 border-dashed border-slate-400/40" aria-hidden="true" />
  </div>
));
TicketPerforation.displayName = 'TicketPerforation';

const TicketCard: React.FC<{ tier: PricingTier }> = ({ tier }) => {
  const navigate = useNavigate();
  const maskedRef = useRef<HTMLDivElement>(null);
  const perforationRef = useRef<HTMLDivElement>(null);

  // Keep the mask's notches aligned with the tear line as content reflows
  useLayoutEffect(() => {
    const box = maskedRef.current;
    const perforation = perforationRef.current;
    if (!box || !perforation) { return; }

    const update = () => {
      box.style.setProperty('--notch-y', `${perforation.offsetTop + perforation.offsetHeight / 2}px`);
    };
    update();

    if (typeof ResizeObserver === 'undefined') { return; }
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => { observer.disconnect(); };
  }, []);

  const savePct = tier.originalPrice > tier.price
    ? Math.round((1 - tier.price / tier.originalPrice) * 100)
    : 0;

  return (
    <div
      data-scene-card
      className={`group relative h-full rounded-2xl transition-transform duration-300 ${
        tier.highlighted ? 'shadow-[var(--shadow-brand)]' : 'hover:-translate-y-1'
      }`}
    >
      {tier.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1 bg-brand-600 text-white rounded-full text-xs font-bold tracking-wider uppercase shadow-[var(--shadow-brand)]">
          Most Popular
        </span>
      )}

      <div
        ref={maskedRef}
        style={ticketMaskStyle}
        className={`relative overflow-hidden rounded-2xl p-8 h-full flex flex-col transition-colors duration-300 ${
          tier.highlighted
            ? 't-card border-2 border-brand-500/40'
            : 't-card border t-border group-live:border-brand-500/30'
        }`}
      >
        {tier.highlighted && (
          <div
            className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Ticket header strip */}
        <div
          className="relative flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.25em] t-text-3 mb-6"
          aria-hidden="true"
        >
          <span>Admit One</span>
          <span className={tier.highlighted ? 'text-brand-500' : ''}>
            {`No. 00${tier.highlighted ? 2 : 1}`}
          </span>
        </div>

        <div className="relative mb-6">
          <h3 className="text-xl font-bold t-text mb-1">{tier.title}</h3>
          <p className="text-sm t-text-3">{tier.subtitle}</p>
        </div>

        <div className="relative">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black t-text" style={{ fontFamily: 'var(--font-display)' }}>
              {formatPrice(tier.price)}
            </span>
            <span className="text-lg t-text-3 line-through">{formatPrice(tier.originalPrice)}</span>
          </div>
          <p className="text-xs t-text-3 mt-2">One-time payment · No subscription</p>
        </div>

        <TicketPerforation ref={perforationRef} label={savePct > 0 ? `SAVE ${savePct}%` : undefined} />

        <ul className="relative space-y-3 mb-8 flex-1">
          {tier.features.map(f => (
            <li key={f} className="flex items-start gap-3 text-sm t-text-2">
              <Check size={16} className="text-[var(--status-success-text)] shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>

        <Button
          variant={tier.highlighted ? 'primary' : 'secondary'}
          size="lg"
          rightIcon={<ArrowRight size={16} />}
          fullWidth
          onClick={() => navigate('/courses')}
        >
          {tier.cta}
        </Button>
      </div>
    </div>
  );
};

export const PricingSection: React.FC = () => {
  const [tiers, setTiers] = useState<PricingTier[]>(FALLBACK_TIERS);

  useEffect(() => {
    Promise.all([
      coursesApi.getCourses({ page: 1, pageSize: 50, withCount: false }),
    ])
      .then(([res]) => {
        const courses = res.courses;
        const modules = courses.filter(c => c.type === 'MODULE' && c.price > 0);
        const bundles = courses.filter(c => c.type === 'BUNDLE' && c.price > 0);

        if (modules.length === 0 && bundles.length === 0) {return;}

        const avgModulePrice = modules.length > 0
          ? Math.round(modules.reduce((s, c) => s + c.price, 0) / modules.length)
          : 49900;
        const avgBundlePrice = bundles.length > 0
          ? Math.round(bundles.reduce((s, c) => s + c.price, 0) / bundles.length)
          : 99900;

        setTiers([
          {
            ...FALLBACK_TIERS[0],
            price: avgModulePrice,
            originalPrice: Math.round(avgModulePrice * 1.5),
          },
          {
            ...FALLBACK_TIERS[1],
            price: avgBundlePrice,
            originalPrice: Math.round(avgBundlePrice * 2),
          },
        ]);
      })
      .catch(err => logger.warn('[PricingSection] Failed to load course prices:', err));
  }, []);

  return (
    <section className="relative py-24 t-bg border-t t-border overflow-x-clip">
      {/* Cinematic glow behind the cards, echoing the hero */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] bg-brand-600/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <HorizontalGallery
          count={tiers.length}
          desktopGrid="md:grid-cols-2"
          mobileLayout="stack"
          heading={
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block px-4 py-1.5 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] text-brand-700 dark:text-brand-400 font-bold tracking-widest uppercase text-xs mb-4">
                  Simple Pricing
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold t-text" style={{ fontFamily: 'var(--font-display)' }}>
                  Invest in Your{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">Craft.</span>
                </h2>
                <p className="t-text-2 text-lg mt-4 max-w-2xl mx-auto">
                  One-time payment. Lifetime access. No subscriptions, no recurring fees.
                </p>
              </div>
            </FadeIn>
          }
        >
          {tiers.map((tier) => (
            <TicketCard key={tier.title} tier={tier} />
          ))}
        </HorizontalGallery>

        <FadeIn delay={2 * STAGGER_MS}>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-sm t-text-3">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand-500" /> Secure Razorpay checkout
            </span>
            <span className="flex items-center gap-2">
              <Zap size={16} className="text-brand-500" /> Instant access after payment
            </span>
            <span className="flex items-center gap-2">
              <Award size={16} className="text-brand-500" /> Certificate of completion
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
