import { ArrowRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { digitalAssetsApi } from '../../services/api';
import { logger } from '../../utils/logger';
import { AssetCard } from '../AssetCard';

import type { DigitalAsset } from '../../types';

/**
 * Homepage "Creator Toolkit" strip. Renders nothing until loaded and nothing when
 * there are no published assets — so it never disturbs the landing layout before
 * the shop has stock.
 */
export const AssetsShowcaseSection: React.FC = () => {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    digitalAssetsApi.getAssets({ pageSize: 4, sort: 'popular', withCount: false })
      .then(res => setAssets(res.assets))
      .catch(err => logger.warn('[AssetsShowcaseSection] failed to load:', err))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || assets.length === 0) { return null; }

  return (
    <section className="py-24 t-bg" id="assets-showcase">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <span className="inline-block px-3 py-1 bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-full font-bold tracking-wider uppercase text-[10px] mb-3">Shop</span>
            <h2 className="text-4xl font-bold t-text mb-2" style={{ fontFamily: 'var(--font-display)' }}>Creator Toolkit</h2>
            <p className="t-text-2 text-lg">LUTs, presets, sound packs and templates — download and create.</p>
          </div>
          <Link to="/assets" className="hidden sm:inline-flex items-center gap-2 text-brand-500 hover:text-brand-400 font-bold shrink-0">
            Browse all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {assets.map((asset, i) => <AssetCard key={asset.id} asset={asset} index={i} />)}
        </div>
        <div className="text-center mt-10 sm:hidden">
          <Link to="/assets" className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-400 font-bold">Browse all <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
};
