import React, { useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';

import { JsonLd } from '../components';
import { CreatorsSection } from '../components/CreatorsSection';
import {
  HeroSection,
  SocialProofTicker,
  FeaturedCoursesSection,
  AssetsShowcaseSection,
  HowItWorksSection,
  ValuePropsSection,
  InstructorsSection,
  CommunityProofSection,
  PricingSection,
  ClosingSection,
} from '../components/sections';
import { useSiteSection } from '../context/SiteContentContext';
import { useSceneGrade, useInViewActive } from '../hooks';

import type { SiteContentItem } from '../types';

// --- Fallback Data ---

const DEFAULT_FAQS = [
  { q: 'Do I need expensive gear to start?', a: 'Absolutely not. We have dedicated modules for smartphone filmmaking and budget DSLRs. The principles of lighting and composition apply regardless of the camera.' },
  { q: 'Is this suitable for complete beginners?', a: 'Yes. Our \'Zero to Hero\' bundles start with the absolute basics of ISO, Shutter Speed, and Aperture before moving into advanced color grading.' },
  { q: 'Do I get access to the raw footage?', a: 'Yes! All editing courses come with 100GB+ of 6K RAW footage so you can practice grading professional clips, not just your own backyard footage.' },
  { q: 'How does the community feedback work?', a: 'You upload your work to our private Discord. Verified pro instructors review your edits/stills weekly and provide video feedback.' },
];

interface FAQItem {
  q: string;
  a: string;
}

export const Storefront: React.FC = () => {
  const faqRows = useSiteSection('faq');
  const creatorRows = useSiteSection('creators');

  const faqs = useMemo<FAQItem[]>(
    () => (faqRows && faqRows.length > 0
      ? faqRows.map(i => ({ q: i.title, a: i.body }))
      : DEFAULT_FAQS),
    [faqRows],
  );
  const creatorItems = useMemo<SiteContentItem[]>(() => creatorRows ?? [], [creatorRows]);

  const scenePlateRef = useRef<HTMLDivElement>(null);
  const heroZoneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useSceneGrade(scenePlateRef, heroZoneRef);
  // Touch-only: the scroll band stands in for hover on non-card `[data-live]`
  // elements (hero CTAs etc.). Cards in galleries are handled by each
  // HorizontalGallery's own centered-card observer.
  useInViewActive(contentRef);

  const faqSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }), [faqs]);

  return (
    <>
      <Helmet>
        <title>Eyebuckz | Filmmaking Academy</title>
        <meta name="description" content="Master the art of filmmaking with industry-leading courses in cinematography, editing, directing, and more. Learn from working professionals." />
        <meta property="og:title" content="Eyebuckz | Filmmaking Academy" />
        <meta property="og:description" content="Master the art of filmmaking with industry-leading courses. Learn from working professionals." />
        <meta property="og:type" content="website" />
      </Helmet>
      {faqs.length > 0 && <JsonLd data={faqSchema} />}
      {/* overflow-x-CLIP (not hidden): clip still hides horizontal overflow but
          does NOT make this a scroll container, so the `position: sticky`
          HowItWorks steps stage can stick to the viewport. */}
      <div className="cinematic-canvas cinema-base relative font-sans t-text overflow-x-clip">

        {/* Scene plate: a fixed, viewport-sized dark backdrop crossfaded by
            scroll (useSceneGrade). The dark→light change happens in scrolled
            TIME, not page SPACE — the canvas is one tone at every instant,
            so there is never a visible boundary between dark and light. */}
        <div ref={scenePlateRef} aria-hidden="true" className="scene-plate-dark" />

        {/* Cinematic backdrop: floating light pools + film grain over the gradient base */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-[8%] -left-40 w-[480px] h-[480px] rounded-full bg-brand-600/[0.07] dark:bg-brand-600/10 blur-[140px] animate-orb-float will-change-transform" />
          <div className="absolute top-[28%] -right-40 w-[520px] h-[520px] rounded-full bg-orange-500/[0.05] dark:bg-orange-500/[0.07] blur-[150px] animate-orb-float will-change-transform" style={{ animationDelay: '4s' }} />
          <div className="absolute top-[52%] -left-32 w-[450px] h-[450px] rounded-full bg-brand-600/[0.06] dark:bg-brand-600/[0.09] blur-[140px] animate-orb-float will-change-transform" style={{ animationDelay: '8s' }} />
          <div className="absolute top-[76%] -right-32 w-[500px] h-[500px] rounded-full bg-orange-500/[0.05] dark:bg-brand-500/[0.08] blur-[150px] animate-orb-float will-change-transform" style={{ animationDelay: '2s' }} />
          <div className="cinema-grain absolute inset-0 opacity-[0.03] dark:opacity-[0.045]" />
        </div>

        <div ref={contentRef} className="relative">

        {/* 1+2. Cinematic opening — dark tokens from the page top through the
            proof ticker; the darkness itself is painted by the scene plate,
            which dissolves as this block's bottom edge scrolls up. */}
        <div ref={heroZoneRef} className="force-dark pb-48">
          <HeroSection />
          <SocialProofTicker />
        </div>

        {/* 3. Product — promoted from position 7 */}
        <FeaturedCoursesSection />

        {/* 3b. Digital assets shop strip (self-hides when the shop has no stock) */}
        <AssetsShowcaseSection />

        {/* 4. How it works */}
        <HowItWorksSection />

        {/* 5. Value props (merged: ValueCards + Ecosystem) */}
        <ValuePropsSection />

        {/* 6. Instructors */}
        <InstructorsSection />

        {/* 6b. Creators (CMS-driven, optional) */}
        {creatorItems.length > 0 && <CreatorsSection items={creatorItems} />}

        {/* 7. Community proof (merged: Testimonials + CommunityShowcase) */}
        <CommunityProofSection />

        {/* 8. Pricing */}
        <PricingSection />

        {/* 9. Close (merged: FAQ + CTA + EmailCapture) */}
        <ClosingSection faqs={faqs} />

        </div>
      </div>
    </>
  );
};
