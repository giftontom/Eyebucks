import { Download, Package, Loader2, ArrowRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { digitalAssetsApi } from '../services/api';
import { logger } from '../utils/logger';

import { Thumbnail } from './Thumbnail';
import { useToast } from './Toast';

import type { AssetPurchaseWithAsset } from '../types';

/** "My Library" — the user's purchased/owned digital assets with secure downloads. */
export const OwnedAssetsTab: React.FC = () => {
  const { showToast, ToastContainer } = useToast();
  const [items, setItems] = useState<AssetPurchaseWithAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    digitalAssetsApi.getOwnedAssets()
      .then(res => { if (active) { setItems(res); } })
      .catch(err => logger.warn('[OwnedAssetsTab] failed to load:', err))
      .finally(() => { if (active) { setLoading(false); } });
    return () => { active = false; };
  }, []);

  const download = async (assetId: string) => {
    setDownloadingId(assetId);
    try {
      const { downloadUrl } = await digitalAssetsApi.getDownloadUrl(assetId);
      window.open(downloadUrl, '_blank', 'noopener');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not start the download', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-brand-600 animate-spin" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 t-card rounded-2xl t-border border">
        <Package size={40} className="mx-auto t-text-3 mb-4" />
        <p className="text-xl font-bold t-text mb-2">No assets yet</p>
        <p className="t-text-2 mb-6">Browse LUTs, presets, sound packs and templates in the shop.</p>
        <Link to="/assets" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-3 rounded-full transition">
          Browse Shop <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(({ asset, id }) => (
          <div key={id} className="t-card t-border border rounded-2xl overflow-hidden flex flex-col">
            <Link to={`/asset/${asset.slug}`}>
              <Thumbnail src={asset.thumbnail} alt={asset.title} className="w-full h-40 object-cover" />
            </Link>
            <div className="p-4 flex flex-col flex-grow">
              <p className="font-bold t-text leading-tight mb-1">{asset.title}</p>
              <p className="text-xs t-text-3 mb-4 uppercase tracking-wide">{asset.fileType}{asset.fileExt ? ` · ${asset.fileExt}` : ''}</p>
              <button
                onClick={() => download(asset.id)}
                disabled={downloadingId === asset.id}
                className="mt-auto w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg transition"
              >
                {downloadingId === asset.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {downloadingId === asset.id ? 'Preparing...' : 'Download'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
