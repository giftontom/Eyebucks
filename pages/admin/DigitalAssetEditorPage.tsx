import { ArrowLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { AssetUploader, type UploadedAsset } from '../../components/AssetUploader';
import { ImageUpload } from '../../components/ImageUpload';
import { digitalAssetsApi, type DigitalAssetInput } from '../../services/api/digitalAssets.api';
import { translateAdminError } from '../../utils/adminErrors';

import { useAdmin } from './AdminContext';

import type { AssetFileType, AssetLicense, CourseStatus } from '../../types';

const FILE_TYPES: AssetFileType[] = ['LUT', 'PRESET', 'SFX', 'MUSIC', 'OVERLAY', 'PROJECT', 'PDF', 'TEMPLATE', 'OTHER'];
const LICENSES: AssetLicense[] = ['PERSONAL', 'COMMERCIAL', 'EXTENDED'];
const STATUSES: CourseStatus[] = ['DRAFT', 'PUBLISHED'];

const inputCls = 'w-full px-3 py-2 t-input-bg t-border border rounded-lg t-text focus:outline-none focus:ring-2 focus:ring-brand-500';

const Field: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium t-text-2 mb-1">{label}</label>
    {children}
  </div>
);

export const DigitalAssetEditorPage: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { showToast } = useAdmin();
  const isEditing = !!assetId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    price: '',
    comparePrice: '',
    fileType: 'LUT' as AssetFileType,
    license: 'PERSONAL' as AssetLicense,
    version: 'v1',
    status: 'DRAFT' as CourseStatus,
    thumbnail: '',
  });

  // Newly uploaded file (has the storage path); null until the admin uploads.
  const [uploaded, setUploaded] = useState<UploadedAsset | null>(null);
  // Existing file metadata when editing (storage_path is server-only, so we only
  // know its ext/size — enough to show "a file is attached").
  const [existingFile, setExistingFile] = useState<{ fileExt: string; fileSize: number } | null>(null);

  useEffect(() => {
    if (!assetId) { return; }
    const load = async () => {
      try {
        setLoading(true);
        const asset = await digitalAssetsApi.getAdminAsset(assetId);
        if (!asset) {
          showToast('Asset not found', 'error');
          navigate('/admin/digital-assets');
          return;
        }
        setForm({
          title: asset.title,
          slug: asset.slug,
          description: asset.description,
          price: String(asset.price / 100),
          comparePrice: asset.comparePrice !== null ? String(asset.comparePrice / 100) : '',
          fileType: asset.fileType,
          license: asset.license,
          version: asset.version,
          status: asset.status,
          thumbnail: asset.thumbnail || '',
        });
        setExistingFile({ fileExt: asset.fileExt || '', fileSize: asset.fileSize || 0 });
      } catch (err) {
        showToast(translateAdminError(err), 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const hasFile = !!uploaded || !!existingFile;

  const handleSave = async () => {
    if (!form.title || !form.slug || !form.description || form.price === '') {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    const priceNum = Number(form.price);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Price must be 0 or a positive number', 'error');
      return;
    }
    if (form.comparePrice !== '' && (isNaN(Number(form.comparePrice)) || Number(form.comparePrice) < 0)) {
      showToast('Compare-at price must be a positive number', 'error');
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) {
      showToast('Slug must be lowercase letters, numbers, and hyphens only (e.g. "cinematic-luts")', 'error');
      return;
    }
    if (!hasFile) {
      showToast('Please upload the asset file', 'error');
      return;
    }

    setSaving(true);
    try {
      const base = {
        slug: form.slug,
        title: form.title,
        description: form.description,
        price: Math.round(priceNum * 100),
        comparePrice: form.comparePrice !== '' ? Math.round(Number(form.comparePrice) * 100) : null,
        fileType: form.fileType,
        license: form.license,
        version: form.version || 'v1',
        status: form.status,
        thumbnail: form.thumbnail || '',
      };

      if (isEditing && assetId) {
        const patch: Partial<DigitalAssetInput> = { ...base };
        // Only change the stored file if a new one was uploaded.
        if (uploaded) {
          patch.storagePath = uploaded.path;
          patch.fileExt = uploaded.fileExt;
          patch.fileSize = uploaded.fileSize;
        }
        await digitalAssetsApi.updateAsset(assetId, patch);
        showToast('Asset updated!', 'success');
      } else {
        if (!uploaded) {
          showToast('Please upload the asset file', 'error');
          setSaving(false);
          return;
        }
        const input: DigitalAssetInput = {
          ...base,
          storagePath: uploaded.path,
          fileExt: uploaded.fileExt,
          fileSize: uploaded.fileSize,
        };
        await digitalAssetsApi.createAsset(input);
        showToast('Asset created!', 'success');
      }
      navigate('/admin/digital-assets');
    } catch (err) {
      showToast(translateAdminError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="t-text-3">Loading asset...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <Link to="/admin/digital-assets" className="inline-flex items-center gap-2 text-sm t-text-2 hover:t-text transition">
        <ArrowLeft size={16} /> Back to Digital Assets
      </Link>

      <h2 className="text-2xl font-bold t-text">{isEditing ? 'Edit Asset' : 'Create New Asset'}</h2>

      <div className="t-card t-border border rounded-xl shadow-sm p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-5">
          <Field id="asset-title" label="Title *">
            <input id="asset-title" className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Cinematic LUT Pack Vol. 1" />
          </Field>
          <Field id="asset-slug" label="Slug *">
            <input id="asset-slug" className={inputCls} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="cinematic-lut-pack-vol-1" />
          </Field>
        </div>

        <Field id="asset-description" label="Description *">
          <textarea id="asset-description" className={`${inputCls} min-h-[100px]`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What's included, compatibility, how to use…" />
        </Field>

        <div className="grid md:grid-cols-3 gap-5">
          <Field id="asset-price" label="Price (₹) *">
            <input id="asset-price" className={inputCls} type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} placeholder="499 (0 = free)" />
          </Field>
          <Field id="asset-compare" label="Compare-at (₹)">
            <input id="asset-compare" className={inputCls} type="number" min="0" value={form.comparePrice} onChange={e => set('comparePrice', e.target.value)} placeholder="optional" />
          </Field>
          <Field id="asset-version" label="Version">
            <input id="asset-version" className={inputCls} value={form.version} onChange={e => set('version', e.target.value)} placeholder="v1" />
          </Field>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <Field id="asset-filetype" label="File Type *">
            <select id="asset-filetype" className={inputCls} value={form.fileType} onChange={e => set('fileType', e.target.value as AssetFileType)}>
              {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field id="asset-license" label="License">
            <select id="asset-license" className={inputCls} value={form.license} onChange={e => set('license', e.target.value as AssetLicense)}>
              {LICENSES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field id="asset-status" label="Status">
            <select id="asset-status" className={inputCls} value={form.status} onChange={e => set('status', e.target.value as CourseStatus)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <ImageUpload value={form.thumbnail} onChange={url => set('thumbnail', url)} folder="misc" label="Thumbnail / Preview Image" />

        <AssetUploader
          value={existingFile}
          onUploadComplete={(data) => { setUploaded(data); setExistingFile({ fileExt: data.fileExt, fileSize: data.fileSize }); }}
          onRemove={() => { setUploaded(null); setExistingFile(null); }}
        />

        <div className="flex gap-3 pt-6 border-t t-border">
          <button
            onClick={() => navigate('/admin/digital-assets')}
            className="px-6 t-card t-border border hover:bg-[var(--surface-hover)] t-text py-2.5 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Asset' : 'Create Asset')}
          </button>
        </div>
      </div>
    </div>
  );
};
