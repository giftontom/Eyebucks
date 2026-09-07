import { ArrowRight, Download, Package } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { formatPrice } from '../utils/format';

import { Badge } from './Badge';
import { FadeIn } from './FadeIn';
import { Thumbnail } from './Thumbnail';

import type { DigitalAsset } from '../types';

interface AssetCardProps {
  asset: DigitalAsset;
  index: number;
  /** Skip the FadeIn entrance — used inside horizontally-scrubbed galleries. */
  disableReveal?: boolean;
}

const FILE_TYPE_LABEL: Record<DigitalAsset['fileType'], string> = {
  LUT: 'LUT',
  PRESET: 'Preset',
  SFX: 'SFX',
  MUSIC: 'Music',
  OVERLAY: 'Overlay',
  PROJECT: 'Project',
  PDF: 'PDF',
  TEMPLATE: 'Template',
  OTHER: 'Asset',
};

export const AssetCard: React.FC<AssetCardProps> = ({ asset, index, disableReveal = false }) => {
  const isFree = asset.price === 0;
  const hasCompare = asset.comparePrice !== null && asset.comparePrice > asset.price;
  const href = `/asset/${asset.slug}`;

  const card = (
    <div data-scene-card className="group flex flex-col t-card rounded-3xl overflow-hidden t-border border hover:border-brand-500/30 dark:hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none h-full backdrop-blur-sm">
      <Link to={href} className="relative overflow-hidden t-bg-alt block aspect-video">
        <Thumbnail
          src={asset.thumbnail}
          alt={asset.title}
          loading={index < 2 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          className="w-full h-full object-cover transition-transform duration-700 group-live:scale-105 dark:opacity-75 group-live:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge variant="default" size="md" className="uppercase tracking-wide backdrop-blur-md">{FILE_TYPE_LABEL[asset.fileType]}</Badge>
          {isFree && <Badge variant="success" size="md" className="uppercase tracking-wide backdrop-blur-md shadow-lg shadow-green-500/30">Free</Badge>}
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-live:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
          <div className="group-live:scale-110 transition-transform duration-300 flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border border-white/50 backdrop-blur-md">
              <Download size={30} className="text-white" />
            </div>
            <span className="text-white font-bold tracking-widest text-sm uppercase">View Asset</span>
          </div>
        </div>
      </Link>
      <div className="p-5 md:p-6 flex flex-col flex-grow">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 text-xs">
          <span className="inline-flex items-center gap-1 t-text-3 font-medium"><Package size={13} /> {FILE_TYPE_LABEL[asset.fileType]}</span>
          {asset.downloadCount > 0 && (
            <span className="inline-flex items-center gap-1 t-text-3 font-medium"><Download size={13} /> {asset.downloadCount}</span>
          )}
        </div>
        <Link to={href} className="block flex-grow">
          <h3 className="text-lg md:text-xl font-bold t-text mb-2 group-live:text-brand-400 transition-colors leading-snug line-clamp-2 min-h-14">{asset.title}</h3>
          <p className="t-text-2 text-sm leading-relaxed line-clamp-2 mb-4">{asset.description}</p>
        </Link>
        <div className="mt-auto pt-4 md:pt-5 border-t t-border flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-bold t-text">{isFree ? 'Free' : formatPrice(asset.price)}</span>
            {hasCompare && (
              <span className="text-sm t-text-3 line-through">{formatPrice(asset.comparePrice as number)}</span>
            )}
          </div>
          <Link
            to={href}
            className="bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-bold flex items-center gap-2 transition-all duration-200 active:scale-95 shadow-lg shadow-brand-600/20 hover:-translate-y-0.5 shrink-0"
          >
            <span>View</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );

  if (disableReveal) { return card; }
  return (
    <FadeIn delay={index * 50} direction="right" className="h-full">
      {card}
    </FadeIn>
  );
};
AssetCard.displayName = 'AssetCard';
