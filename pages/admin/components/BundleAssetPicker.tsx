import React from 'react';

import type { AdminDigitalAsset } from '../../../types';

interface BundleAssetPickerProps {
  assets: AdminDigitalAsset[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Checklist of digital assets to include in a BUNDLE course. Mirrors
 * {@link BundleCoursePicker}. `getAdminAssets()` returns DRAFT + soft-deleted
 * rows, so soft-deleted assets are filtered out here; DRAFT assets stay
 * selectable (granted at purchase, hidden on the public page until published).
 */
export const BundleAssetPicker: React.FC<BundleAssetPickerProps> = ({
  assets,
  selectedIds,
  onChange,
}) => {
  // Show live assets plus any already-selected asset that has since been
  // archived — otherwise a soft-deleted-but-selected asset would be invisible
  // yet silently re-persisted on save (it can't be unchecked).
  const available = assets.filter(a => !a.deletedAt || selectedIds.includes(a.id));

  return (
    <div>
      <label className="block text-sm font-medium t-text-2 mb-2">Bundled Digital Assets</label>
      <p className="text-xs t-text-2 mb-2">Optionally include downloadable assets (LUTs, presets, SFX…) with this bundle.</p>
      <div className="max-h-48 overflow-y-auto t-border border rounded-lg t-input-bg p-2">
        {available.length === 0 ? (
          <p className="text-sm t-text-3 text-center py-4">No digital assets available</p>
        ) : (
          available.map(a => (
            <label key={a.id} className="flex items-center gap-2 p-2 rounded hover:bg-[var(--surface-hover)] cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(a.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedIds, a.id]);
                  } else {
                    onChange(selectedIds.filter(id => id !== a.id));
                  }
                }}
                className="rounded t-border text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm t-text">{a.title}</span>
              {a.deletedAt ? (
                <span className="text-[10px] font-bold uppercase t-status-danger px-1.5 py-0.5 rounded">Archived</span>
              ) : a.status !== 'PUBLISHED' && (
                <span className="text-[10px] font-bold uppercase t-status-warning px-1.5 py-0.5 rounded">Draft</span>
              )}
              <span className="text-xs t-text-3 ml-auto">{a.fileType}</span>
            </label>
          ))
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs t-text-2 mt-1">{selectedIds.length} asset{selectedIds.length !== 1 ? 's' : ''} selected</p>
      )}
    </div>
  );
};
