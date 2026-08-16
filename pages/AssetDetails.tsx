import { ArrowLeft, Download, Check, FileText, Shield, HardDrive, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { Badge, Thumbnail, useToast } from '../components';
import { checkoutApi, digitalAssetsApi } from '../services/api';
import { formatPrice } from '../utils/format';
import { logger } from '../utils/logger';

import type { DigitalAsset } from '../types';

const FILE_TYPE_LABEL: Record<DigitalAsset['fileType'], string> = {
  LUT: 'LUT Pack',
  PRESET: 'Preset Pack',
  SFX: 'Sound Effects',
  MUSIC: 'Music',
  OVERLAY: 'Overlays',
  PROJECT: 'Project Files',
  PDF: 'PDF / Guide',
  TEMPLATE: 'Template',
  OTHER: 'Digital Asset',
};

const LICENSE_LABEL: Record<DigitalAsset['license'], string> = {
  PERSONAL: 'Personal use',
  COMMERCIAL: 'Commercial use',
  EXTENDED: 'Extended license',
};

function formatBytes(bytes: number | null): string | null {
  if (!bytes) { return null; }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export const AssetDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  const [asset, setAsset] = useState<DigitalAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [owned, setOwned] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!slug) { return; }
    let active = true;
    setLoading(true);
    setNotFound(false);
    digitalAssetsApi.getAsset(slug)
      .then(async (a) => {
        if (!active) { return; }
        if (!a) { setNotFound(true); return; }
        setAsset(a);
        try {
          const isOwned = await digitalAssetsApi.checkOwnership(a.id);
          if (active) { setOwned(isOwned); }
        } catch (err) {
          logger.warn('[AssetDetails] ownership check failed:', err);
        }
      })
      .catch((err) => {
        logger.error('[AssetDetails] failed to load asset:', err);
        if (active) { setNotFound(true); }
      })
      .finally(() => { if (active) { setLoading(false); } });
    return () => { active = false; };
  }, [slug]);

  const handleBuy = async () => {
    if (!asset) { return; }
    // Paid asset → product-aware checkout. Free asset → claim without payment.
    if (asset.price > 0) {
      navigate(`/checkout/asset/${asset.id}`);
      return;
    }
    setClaiming(true);
    try {
      await checkoutApi.claimFreeAsset(asset.id);
      setOwned(true);
      showToast('Added to your library', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not claim this asset';
      if (/unauthor|sign in|log ?in|jwt/i.test(msg)) { navigate('/login'); return; }
      showToast(msg, 'error');
    } finally {
      setClaiming(false);
    }
  };

  const handleDownload = async () => {
    if (!asset) { return; }
    setDownloading(true);
    try {
      const { downloadUrl } = await digitalAssetsApi.getDownloadUrl(asset.id);
      window.open(downloadUrl, '_blank', 'noopener');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not start the download', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (notFound || !asset) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-32 text-center">
        <h1 className="text-2xl font-bold t-text mb-3">Asset not found</h1>
        <p className="t-text-2 mb-6">This asset may have been removed or is no longer available.</p>
        <Link to="/assets" className="text-brand-500 hover:text-brand-400 font-bold">Browse all assets</Link>
      </div>
    );
  }

  const isFree = asset.price === 0;
  const hasCompare = asset.comparePrice !== null && asset.comparePrice > asset.price;
  const size = formatBytes(asset.fileSize);
  const preview = asset.previewUrl || asset.thumbnail;

  return (
    <>
      <Helmet>
        <title>{asset.title} | Eyebuckz Assets</title>
        <meta name="description" content={asset.description.slice(0, 155)} />
      </Helmet>
      <ToastContainer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <Link to="/assets" className="inline-flex items-center gap-2 text-sm t-text-2 hover:t-text transition mb-8">
          <ArrowLeft size={16} /> Back to Assets
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Preview */}
          <div className="rounded-3xl overflow-hidden t-bg-alt t-border border aspect-video">
            <Thumbnail src={preview} alt={asset.title} className="w-full h-full object-cover" />
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default" size="md" className="uppercase tracking-wide">{FILE_TYPE_LABEL[asset.fileType]}</Badge>
              {isFree && <Badge variant="success" size="md" className="uppercase tracking-wide">Free</Badge>}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold t-text mb-4" style={{ fontFamily: 'var(--font-display)' }}>{asset.title}</h1>
            <p className="t-text-2 text-base leading-relaxed whitespace-pre-line mb-6">{asset.description}</p>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex items-center gap-2 t-text-2 text-sm"><Shield size={16} className="text-brand-500" /> {LICENSE_LABEL[asset.license]}</div>
              <div className="flex items-center gap-2 t-text-2 text-sm"><FileText size={16} className="text-brand-500" /> {asset.fileExt ? asset.fileExt.toUpperCase() : 'Download'}</div>
              {size && <div className="flex items-center gap-2 t-text-2 text-sm"><HardDrive size={16} className="text-brand-500" /> {size}</div>}
              <div className="flex items-center gap-2 t-text-2 text-sm"><Download size={16} className="text-brand-500" /> {asset.downloadCount} downloads</div>
            </div>

            {/* Buy box */}
            <div className="mt-auto t-card t-border border rounded-2xl p-6 shadow-sm">
              <div className="flex items-end gap-3 mb-4">
                <span className="text-3xl font-bold t-text">{isFree ? 'Free' : formatPrice(asset.price)}</span>
                {hasCompare && <span className="text-lg t-text-3 line-through mb-1">{formatPrice(asset.comparePrice as number)}</span>}
              </div>

              {owned ? (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold px-6 py-3.5 rounded-full transition flex items-center justify-center gap-2"
                >
                  {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {downloading ? 'Preparing download...' : 'Download'}
                </button>
              ) : (
                <button
                  onClick={handleBuy}
                  disabled={claiming}
                  className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold px-6 py-3.5 rounded-full transition flex items-center justify-center gap-2"
                >
                  {claiming ? <Loader2 size={18} className="animate-spin" /> : null}
                  {claiming ? 'Adding...' : (isFree ? 'Get it free' : 'Buy now')}
                </button>
              )}

              <div className="mt-4 space-y-2">
                <p className="flex items-center gap-2 text-xs t-text-3"><Check size={14} className="text-green-500" /> Instant download after purchase</p>
                <p className="flex items-center gap-2 text-xs t-text-3"><Check size={14} className="text-green-500" /> Lifetime access from your library</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
