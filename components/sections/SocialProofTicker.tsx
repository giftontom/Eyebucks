import { Users, Trophy, Globe } from 'lucide-react';
import React, { useMemo } from 'react';

import { useSiteSection } from '../../context/SiteContentContext';

// Verbatim ticker text. Icons stay positional/hardcoded (Users, Trophy, Globe);
// only these strings can be overridden via CMS metadata.items (string[]).
const DEFAULT_ITEMS = [
  '10,000+ Students',
  'Creators & Influencers Academy #1',
  '50+ Countries',
];

export const SocialProofTicker: React.FC = () => {
  const rows = useSiteSection('social_proof');

  const items = useMemo(() => {
    const cmsItems = rows?.[0]?.metadata?.items;
    return Array.isArray(cmsItems) && cmsItems.length > 0 ? (cmsItems as string[]) : DEFAULT_ITEMS;
  }, [rows]);

  return (
    // The ticker's light text lives on the dark scene; it fades out with the
    // scene grade (--scene-dark) as the canvas lightens, so its last sliver
    // never washes against a brightening backdrop. Default 1 before JS runs.
    <section id="social-proof" className="t-bg-alt overflow-hidden py-6 relative" style={{ opacity: 'var(--scene-dark, 1)' }}>
      {/* Edge fades via alpha mask (not painted black gradients) so they work
          over any backdrop tone while the scene grade dissolves behind. */}
      {/* Two identical tracks, animated to -50% of the pair.
          Previously a single track ran 0 → -100%, i.e. it slid entirely off
          the left edge before snapping back — which is why the text looked cut
          off and appeared to jump rather than loop. With a duplicate following
          it, -50% lands exactly where the copy began, so the loop is seamless.
          `aria-hidden` on the clone keeps it out of the accessibility tree.
          The mask is narrower on mobile: 8rem of fade on a 360px screen ate
          most of the line. */}
      <div className="flex w-full whitespace-nowrap overflow-hidden opacity-70 hover:opacity-100 transition-opacity duration-300 [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)] sm:[mask-image:linear-gradient(to_right,transparent,black_8rem,black_calc(100%-8rem),transparent)]">
        <div className="flex animate-marquee shrink-0 items-center text-sm font-bold t-text-2 uppercase tracking-[0.2em] motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-8 sm:gap-16 px-4 sm:px-8">
              {[...Array(3)].map((_, i) => (
                <React.Fragment key={i}>
                  <span className="flex items-center gap-3 t-text hover:t-text transition-colors"><Users size={18} className="text-brand-500" /> {items[0]}</span>
                  <span className="t-text-3">/</span>
                  <span className="flex items-center gap-3 t-text hover:t-text transition-colors"><Trophy size={18} className="text-yellow-400" /> {items[1]}</span>
                  <span className="t-text-3">/</span>
                  <span className="flex items-center gap-3 t-text hover:t-text transition-colors"><Globe size={18} className="text-blue-400" /> {items[2]}</span>
                  <span className="t-text-3">/</span>
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
