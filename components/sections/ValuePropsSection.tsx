import { BookOpen, Award, Video, Palette, Layers, Users, Zap, ArrowRight, type LucideIcon } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { siteContentApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { FadeIn, STAGGER_MS } from '../FadeIn';
import { HorizontalGallery } from '../HorizontalGallery';

import type { SiteContentItem } from '../../types';

interface ValueProp {
  icon: string;
  title: string;
  description: string;
  bullets: string[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  book: BookOpen,
  award: Award,
  video: Video,
  palette: Palette,
  layers: Layers,
  users: Users,
};

const DEFAULT_PROPS: ValueProp[] = [
  {
    icon: 'book',
    title: 'Practical Learning',
    description: 'Hands-on projects with professional raw footage. No theory-only lectures — you build real portfolio pieces.',
    bullets: ['50+ structured courses', '6K RAW footage included', 'Real client briefs'],
  },
  {
    icon: 'award',
    title: 'Industry Experts',
    description: 'Learn from working professionals who shoot for major brands. Insider techniques and workflows.',
    bullets: ['Working DPs & colorists', 'Brand-shoot case studies', 'Live Q&A sessions'],
  },
  {
    icon: 'palette',
    title: 'Creator Toolkit',
    description: 'Everything you need to ship: LUTs, contract templates, business presets, and a working community.',
    bullets: ['1000+ assets & LUTs', 'Pricing & contract templates', 'Private Discord access'],
  },
];

interface ValuePropsCopy {
  pill: string;
  title: string;
  body: string;
  footerLinkLabel: string;
}

const DEFAULT_COPY: ValuePropsCopy = {
  pill: 'Why Eyebuckz',
  title: 'Built for creators who mean it.',
  body: 'More than courses. A complete production toolkit — taught by people who work the camera, not the textbook.',
  footerLinkLabel: 'Browse the full catalog',
};

function parseProp(item: SiteContentItem): ValueProp {
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  const bulletsRaw = meta.bullets;
  const bullets = Array.isArray(bulletsRaw)
    ? bulletsRaw.map(String)
    : typeof bulletsRaw === 'string'
      ? bulletsRaw.split('|').map(s => s.trim()).filter(Boolean)
      : [];
  return {
    icon: (meta.icon as string) ?? 'book',
    title: item.title,
    description: item.body ?? '',
    bullets,
  };
}

/**
 * Card with a brand-tinted spotlight that follows the cursor. Coordinates are
 * written straight to CSS vars on the node — no React re-renders on mousemove.
 */
const SpotlightCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) { return; }
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      data-scene-card
      className="group relative t-card t-border border rounded-2xl p-8 h-full flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-(--shadow-elevated)"
    >
      {/* spotlight-layer: on mobile the scroll band reveals it (group-live)
          and spot-drift sweeps it across the card in place of the cursor. */}
      <div
        className="spotlight-layer absolute inset-0 opacity-0 group-live:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,59,48,0.09), transparent 70%)' }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
};

export const ValuePropsSection: React.FC = () => {
  const [props, setProps] = useState<ValueProp[]>(DEFAULT_PROPS);
  const [copy, setCopy] = useState<ValuePropsCopy>(DEFAULT_COPY);

  useEffect(() => {
    siteContentApi.getBySection('value_cards')
      .then(items => {
        if (items.length > 0) {setProps(items.map(parseProp));}
      })
      .catch(err => logger.warn('[ValuePropsSection] Failed to load from CMS:', err));
  }, []);

  useEffect(() => {
    siteContentApi.getBySection('value_props_copy')
      .then(items => {
        const item = items[0];
        if (!item) { return; }
        const meta = (item.metadata ?? {}) as Record<string, unknown>;
        setCopy({
          pill: typeof meta.pill === 'string' && meta.pill ? meta.pill : DEFAULT_COPY.pill,
          title: item.title || DEFAULT_COPY.title,
          body: item.body || DEFAULT_COPY.body,
          footerLinkLabel: typeof meta.footerLinkLabel === 'string' && meta.footerLinkLabel
            ? meta.footerLinkLabel
            : DEFAULT_COPY.footerLinkLabel,
        });
      })
      .catch(err => logger.warn('[ValuePropsSection] header CMS load failed:', err));
  }, []);

  return (
    <section id="value-props" className="py-20 md:py-28 t-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <HorizontalGallery
          count={props.length}
          desktopGrid="md:grid-cols-3"
          heading={
            <FadeIn>
              <div className="text-center mb-16 max-w-2xl mx-auto">
                <span className="inline-block px-4 py-1.5 rounded-full border border-[rgba(255,59,48,0.3)] bg-[rgba(255,59,48,0.1)] scene-adaptive-brand font-bold tracking-widest uppercase text-xs mb-4">
                  {copy.pill}
                </span>
                <h2 className="t-h2 scene-adaptive-text mb-4">{copy.title}</h2>
                <p className="t-body-lg scene-adaptive-text-2">
                  {copy.body}
                </p>
              </div>
            </FadeIn>
          }
        >
          {props.map((p) => {
            const Icon = ICON_MAP[p.icon] ?? BookOpen;
            return (
              <SpotlightCard key={p.title}>
                <div className="relative w-14 h-14 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center text-brand-500 mb-6 transition-transform duration-300 group-live:scale-110 group-live:-rotate-6">
                  <Icon size={28} />
                </div>
                <h3 className="relative t-h3 t-text mb-3">{p.title}</h3>
                <p className="relative t-body t-text-2 mb-5">{p.description}</p>
                {p.bullets.length > 0 && (
                  <ul className="relative space-y-2 mt-auto">
                    {p.bullets.map((b, j) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm t-text transition-transform duration-300 group-live:translate-x-1.5 motion-reduce:transition-none"
                        style={{ transitionDelay: `${j * 60}ms` }}
                      >
                        <Zap size={14} className="text-brand-500 mt-1 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SpotlightCard>
            );
          })}
        </HorizontalGallery>

        <FadeIn delay={3 * STAGGER_MS}>
          <div className="text-center mt-12">
            <Link
              to="/courses"
              data-live
              className="inline-flex items-center gap-2 scene-adaptive-text-2 hover:text-brand-500 font-semibold text-sm transition-colors group"
            >
              {copy.footerLinkLabel}
              <ArrowRight size={16} className="group-live:translate-x-1 transition-transform" />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};
