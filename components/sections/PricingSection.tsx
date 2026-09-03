import { ArrowRight, Award, Check, ShieldCheck, Zap } from 'lucide-react';
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../../context/LanguageContext';
import { useSiteSection } from '../../context/SiteContentContext';
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
  /**
   * Plain-text price overrides from the CMS (`pricing_copy` tierN* fields).
   * When `priceText` is set it is rendered VERBATIM — deliberately not linked
   * to any product's price — with `pricePrefix` ("Starting at") above it.
   * The save pill then comes from `saveLabel` instead of being computed.
   */
  pricePrefix?: string;
  priceText?: string;
  compareText?: string;
  saveLabel?: string;
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

// CMS-overridable header/chrome copy. Prices/tiers are NOT included here —
// they are computed live from the courses table (see PricingSection effect).
interface SectionCopy {
  eyebrow: string;
  heading: string;
  subheading: string;
  popularLabel: string;
  paymentNote: string;
  ticketLabel: string;
  trustBadges: string[];
}

const DEFAULT_COPY: SectionCopy = {
  eyebrow: 'Simple Pricing',
  heading: 'Invest in Your Craft.',
  subheading: 'One-time payment. Lifetime access. No subscriptions, no recurring fees.',
  popularLabel: 'Most Popular',
  paymentNote: 'One-time payment · No subscription',
  ticketLabel: 'Admit One',
  trustBadges: [
    'Secure Razorpay checkout',
    'Instant access after payment',
    'Certificate of completion',
  ],
};

// Icons for the trust badges row, by position. Preserves the original
// ShieldCheck / Zap / Award order for the default 3-badge layout.
const TRUST_BADGE_ICONS = [ShieldCheck, Zap, Award] as const;

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

const TicketCard: React.FC<{ tier: PricingTier; copy: SectionCopy }> = ({ tier, copy }) => {
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

  // With a plain-text price there is nothing to compute a percentage from —
  // the pill shows the CMS saveLabel or nothing at all.
  const savePct = !tier.priceText && tier.originalPrice > tier.price
    ? Math.round((1 - tier.price / tier.originalPrice) * 100)
    : 0;
  const saveLabel = tier.priceText
    ? tier.saveLabel
    : (tier.saveLabel ?? (savePct > 0 ? `SAVE ${savePct}%` : undefined));

  return (
    <div
      data-scene-card
      className={`group relative h-full rounded-2xl transition-transform duration-300 ${
        tier.highlighted ? 'shadow-[var(--shadow-brand)]' : 'hover:-translate-y-1'
      }`}
    >
      {tier.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1 bg-brand-600 text-white rounded-full text-xs font-bold tracking-wider uppercase shadow-[var(--shadow-brand)]">
          {copy.popularLabel}
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
          <span>{copy.ticketLabel}</span>
          <span className={tier.highlighted ? 'text-brand-500' : ''}>
            {`No. 00${tier.highlighted ? 2 : 1}`}
          </span>
        </div>

        <div className="relative mb-6">
          <h3 className="text-xl font-bold t-text mb-1">{tier.title}</h3>
          <p className="text-sm t-text-3">{tier.subtitle}</p>
        </div>

        <div className="relative">
          {tier.pricePrefix && (
            <p className="text-xs font-bold uppercase tracking-wider t-text-3 mb-1">{tier.pricePrefix}</p>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black t-text" style={{ fontFamily: 'var(--font-display)' }}>
              {tier.priceText ?? formatPrice(tier.price)}
            </span>
            {(tier.priceText ? tier.compareText : true) && (
              <span className="text-lg t-text-3 line-through">
                {tier.priceText ? tier.compareText : formatPrice(tier.originalPrice)}
              </span>
            )}
          </div>
          <p className="text-xs t-text-3 mt-2">{copy.paymentNote}</p>
        </div>

        <TicketPerforation ref={perforationRef} label={saveLabel} />

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
  const { language } = useLanguage();
  const [tiers, setTiers] = useState<PricingTier[]>(FALLBACK_TIERS);
  const copyRows = useSiteSection('pricing_copy');

  // CMS override for header/chrome copy only (prices stay computed live). Singleton: items[0].
  const copy = useMemo<SectionCopy>(() => {
    const item = copyRows?.[0];
    if (!item) { return DEFAULT_COPY; }
    const meta = (item.metadata || {}) as Record<string, unknown>;
    const str = (v: unknown, fallback: string) =>
      typeof v === 'string' && v.trim() ? v : fallback;
    const arr = (v: unknown, fallback: string[]) =>
      Array.isArray(v) && v.length > 0 ? v.map(String) : fallback;
    return {
      eyebrow: str(meta.pill, DEFAULT_COPY.eyebrow),
      heading: str(item.title, DEFAULT_COPY.heading),
      subheading: str(item.body, DEFAULT_COPY.subheading),
      popularLabel: str(meta.popularLabel, DEFAULT_COPY.popularLabel),
      paymentNote: str(meta.paymentNote, DEFAULT_COPY.paymentNote),
      ticketLabel: str(meta.ticketLabel, DEFAULT_COPY.ticketLabel),
      trustBadges: arr(meta.trustBadges, DEFAULT_COPY.trustBadges),
    };
  }, [copyRows]);

  // CMS per-tier overrides. Text fields override their computed counterparts
  // individually; anything left blank keeps the automatic value. Feature lists
  // replace wholesale when non-empty.
  const mergedTiers = useMemo<PricingTier[]>(() => {
    const meta = (copyRows?.[0]?.metadata ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const arr = (v: unknown) => (Array.isArray(v) && v.filter(x => String(x).trim()).length > 0
      ? v.map(String).filter(x => x.trim()) : undefined);
    return tiers.map((tier, i) => {
      const n = i + 1;
      return {
        ...tier,
        title: str(meta[`tier${n}Title`]) ?? tier.title,
        subtitle: str(meta[`tier${n}Subtitle`]) ?? tier.subtitle,
        features: arr(meta[`tier${n}Features`]) ?? tier.features,
        cta: str(meta[`tier${n}Cta`]) ?? tier.cta,
        pricePrefix: str(meta[`tier${n}PricePrefix`]),
        priceText: str(meta[`tier${n}Price`]),
        compareText: str(meta[`tier${n}Compare`]),
        saveLabel: str(meta[`tier${n}SaveLabel`]),
      };
    });
  }, [tiers, copyRows]);

  useEffect(() => {
    Promise.all([
      coursesApi.getCourses({ page: 1, pageSize: 50, withCount: false, language }),
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
  }, [language]);

  return (
    <section id="pricing" className="relative py-24 t-bg border-t t-border overflow-x-clip">
      {/* Cinematic glow behind the cards, echoing the hero */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] bg-brand-600/10 rounded-full blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <HorizontalGallery
          count={mergedTiers.length}
          desktopGrid="md:grid-cols-2"
          mobileLayout="stack"
          heading={
            <FadeIn>
              <div className="text-center mb-16">
                <span className="inline-block px-4 py-1.5 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] text-brand-700 dark:text-brand-400 font-bold tracking-widest uppercase text-xs mb-4">
                  {copy.eyebrow}
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold t-text" style={{ fontFamily: 'var(--font-display)' }}>
                  {(() => {
                    // Keep the last word in the brand gradient, matching the
                    // default "Invest in Your <Craft.>" treatment for any override.
                    const m = copy.heading.match(/^(.*\S)(\s+)(\S+)$/);
                    return m
                      ? <>{m[1]}{' '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">{m[3]}</span></>
                      : <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">{copy.heading}</span>;
                  })()}
                </h2>
                <p className="t-text-2 text-lg mt-4 max-w-2xl mx-auto">
                  {copy.subheading}
                </p>
              </div>
            </FadeIn>
          }
        >
          {mergedTiers.map((tier) => (
            <TicketCard key={tier.title} tier={tier} copy={copy} />
          ))}
        </HorizontalGallery>

        <FadeIn delay={2 * STAGGER_MS}>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-12 text-sm t-text-3">
            {copy.trustBadges.map((badge, i) => {
              const Icon = TRUST_BADGE_ICONS[i % TRUST_BADGE_ICONS.length];
              return (
                <span key={badge} className="flex items-center gap-2">
                  <Icon size={16} className="text-brand-500" /> {badge}
                </span>
              );
            })}
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
