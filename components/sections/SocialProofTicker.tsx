import { Users, Trophy, Globe } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { siteContentApi } from '../../services/api';
import { logger } from '../../utils/logger';

// Verbatim ticker text. Icons stay positional/hardcoded (Users, Trophy, Globe);
// only these strings can be overridden via CMS metadata.items (string[]).
const DEFAULT_ITEMS = [
  '10,000+ Students',
  'Creators & Influencers Academy #1',
  '50+ Countries',
];

export const SocialProofTicker: React.FC = () => {
  const [items, setItems] = useState<string[]>(DEFAULT_ITEMS);

  useEffect(() => {
    siteContentApi.getBySection('social_proof')
      .then(content => {
        const cmsItems = content[0]?.metadata?.items;
        if (Array.isArray(cmsItems) && cmsItems.length > 0) {
          setItems(cmsItems);
        }
      })
      .catch(err => logger.warn('[SocialProofTicker] CMS load failed:', err));
  }, []);

  return (
    // The ticker's light text lives on the dark scene; it fades out with the
    // scene grade (--scene-dark) as the canvas lightens, so its last sliver
    // never washes against a brightening backdrop. Default 1 before JS runs.
    <section className="t-bg-alt overflow-hidden py-6 relative" style={{ opacity: 'var(--scene-dark, 1)' }}>
      {/* Edge fades via alpha mask (not painted black gradients) so they work
          over any backdrop tone while the scene grade dissolves behind. */}
      <div className="flex w-full whitespace-nowrap overflow-hidden opacity-70 hover:opacity-100 transition-opacity duration-300 [mask-image:linear-gradient(to_right,transparent,black_8rem,black_calc(100%-8rem),transparent)]">
        <div className="flex animate-marquee items-center gap-16 min-w-full px-4 text-sm font-bold t-text-2 uppercase tracking-[0.2em]">
          {[...Array(6)].map((_, i) => (
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
      </div>
    </section>
  );
};
