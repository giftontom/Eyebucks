import { Camera, TrendingUp, FileText, DollarSign, Instagram, Zap } from 'lucide-react';
import React, { useMemo } from 'react';

import { useSiteSection } from '../context/SiteContentContext';

import { FadeIn } from './FadeIn';

import type { SiteContentItem } from '../types';

interface CreatorCard {
  title: string;
  body: string;
  icon: string;
}

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  camera: Camera,
  trending: TrendingUp,
  file: FileText,
  dollar: DollarSign,
  instagram: Instagram,
  zap: Zap,
};

const DEFAULT_CARDS: CreatorCard[] = [
  { title: 'Brand Deal Ready', body: 'Scripts, rate cards, and pitch decks to land your first brand collaboration with confidence.', icon: 'dollar' },
  { title: 'Content Strategy', body: 'Build a posting rhythm, content calendar, and analytics workflow that consistently grows your audience.', icon: 'trending' },
  { title: 'Media Kit & Contracts', body: 'Professional contracts, media kits, and pricing guides tailored for influencer creators.', icon: 'file' },
  { title: 'Monetisation Blueprint', body: 'From 0 to paid — YouTube, Instagram, and direct client monetisation strategies from working creators.', icon: 'zap' },
];

interface HeaderCopy {
  eyebrow: string;
  heading: string;
  subheading: string;
}

const DEFAULT_COPY: HeaderCopy = {
  eyebrow: 'Creators & Influencers Academy',
  heading: 'Built for Creators Who Get Paid.',
  subheading: 'Not just filmmaking — brand deals, content strategy, and the business side of being a creator.',
};

interface Props {
  items?: SiteContentItem[];
}

export const CreatorsSection: React.FC<Props> = ({ items = [] }) => {
  const cards: CreatorCard[] = items.length > 0
    ? items.map(item => ({
        title: item.title,
        body: item.body ?? '',
        icon: (item.metadata as Record<string, string>)?.icon ?? 'zap',
      }))
    : DEFAULT_CARDS;

  const copyRows = useSiteSection('creators_copy');

  const copy = useMemo<HeaderCopy>(() => {
    const item = copyRows?.[0];
    if (!item) { return DEFAULT_COPY; }
    const metadata = (item.metadata as Record<string, string>) ?? {};
    return {
      eyebrow: metadata.pill ?? DEFAULT_COPY.eyebrow,
      heading: item.title ?? DEFAULT_COPY.heading,
      subheading: item.body ?? DEFAULT_COPY.subheading,
    };
  }, [copyRows]);

  return (
    <section id="creators" className="py-24 t-bg-alt overflow-hidden border-t t-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-brand-600/20 border border-brand-600/30 text-brand-500 rounded-full font-bold tracking-wider uppercase text-xs mb-4">
              {copy.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold t-text mb-4" style={{ fontFamily: 'var(--font-display)' }}>
              {copy.heading}
            </h2>
            <p className="t-text-2 text-lg max-w-2xl mx-auto">
              {copy.subheading}
            </p>
          </div>
        </FadeIn>

        {/* Column count follows the row count (capped at 4). A fixed
            lg:grid-cols-4 left an empty fourth column when the CMS held three
            rows, so the whole card group sat visibly left of centre on
            desktop — fine on mobile, where it is a single column. */}
        <div
          className={`grid grid-cols-1 gap-6 ${
            cards.length === 1
              ? 'max-w-sm mx-auto'
              : cards.length === 2
                ? 'sm:grid-cols-2 lg:max-w-4xl lg:mx-auto'
                : cards.length === 3
                  ? 'sm:grid-cols-2 lg:grid-cols-3'
                  : 'sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {cards.map((card, i) => {
            const Icon = ICON_MAP[card.icon] ?? Zap;
            return (
              <FadeIn key={i} delay={i * 80}>
                <div className="t-card border t-border rounded-2xl p-6 hover:border-brand-500/40 transition-all duration-300 h-full group">
                  <div className="w-12 h-12 bg-brand-600/20 border border-brand-600/30 rounded-xl flex items-center justify-center text-brand-500 mb-5 group-hover:scale-110 transition-transform">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold t-text mb-2">{card.title}</h3>
                  <p className="text-sm t-text-2 leading-relaxed">{card.body}</p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
};
