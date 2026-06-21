import { Plus, Layers, Code2, FormInput } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { ImageUpload } from '../../components';
import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';

import { useAdmin } from './AdminContext';
import { AdminModal } from './components/AdminModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  SECTION_SCHEMAS,
  CREATE_SECTIONS,
  GROUP_ORDER,
  defaultMetaFor,
  type FieldDef,
} from './content/sectionSchemas';

import type { SiteContentItem } from '../../types';

const inputCls =
  'w-full t-input-bg t-border border rounded-lg p-2.5 t-text outline-none focus:ring-2 focus:ring-brand-500';

/** Renders a single typed metadata field from the section schema. */
const FieldInput: React.FC<{
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}> = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'image':
      return (
        <ImageUpload
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          folder={field.folder ?? 'misc'}
          aspect={field.aspect ?? 'aspect-video'}
          onChange={(url) => onChange(url)}
        />
      );
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === undefined ? Boolean(field.default) : Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 text-brand-600 t-border rounded focus:ring-brand-500"
          />
          <span className="text-sm t-text">{field.label}</span>
        </label>
      );
    case 'select':
      return (
        <div>
          <label className="block text-sm font-medium t-text-2 mb-2">{field.label}</label>
          <select value={String(value ?? field.default ?? '')} onChange={(e) => onChange(e.target.value)} className={inputCls}>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );
    case 'string-array': {
      const lines = Array.isArray(value) ? (value as unknown[]).map(String).join('\n') : '';
      return (
        <div>
          <label className="block text-sm font-medium t-text-2 mb-2">{field.label}</label>
          <textarea
            value={lines}
            onChange={(e) => onChange(e.target.value.split('\n'))}
            rows={3}
            className={inputCls}
            placeholder={field.placeholder}
          />
          {field.help && <p className="text-xs t-text-3 mt-1">{field.help}</p>}
        </div>
      );
    }
    case 'number':
      return (
        <div>
          <label className="block text-sm font-medium t-text-2 mb-2">{field.label}</label>
          <input
            type="number"
            value={value === undefined || value === null ? String(field.default ?? '') : String(value)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={inputCls}
          />
        </div>
      );
    case 'color':
      return (
        <div>
          <label className="block text-sm font-medium t-text-2 mb-2">{field.label}</label>
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
            placeholder="#111827 or var(--page-alt)"
          />
        </div>
      );
    case 'url':
    case 'text':
    default:
      return (
        <div>
          <label className="block text-sm font-medium t-text-2 mb-2">
            {field.label}{field.required && ' *'}
          </label>
          <input
            type={field.type === 'url' ? 'url' : 'text'}
            value={String(value ?? field.default ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
            placeholder={field.placeholder}
          />
          {field.help && <p className="text-xs t-text-3 mt-1">{field.help}</p>}
        </div>
      );
  }
};

export const ContentPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [siteContent, setSiteContent] = useState<SiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SiteContentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    section: 'faq' as string,
    title: '',
    body: '',
    orderIndex: 0,
    isActive: true,
  });
  const [meta, setMeta] = useState<Record<string, unknown>>(defaultMetaFor('faq'));
  const [advancedMode, setAdvancedMode] = useState(false);
  const [advancedJson, setAdvancedJson] = useState('{}');

  const schema = SECTION_SCHEMAS[form.section];

  const fetchContent = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await adminApi.getSiteContent();
      setSiteContent(res.items);
    } catch (err: any) {
      logger.error('Failed to fetch site content:', err);
      setLoadError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContent(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ section: 'faq', title: '', body: '', orderIndex: 0, isActive: true });
    setMeta(defaultMetaFor('faq'));
    setAdvancedMode(false);
    setAdvancedJson('{}');
    setShowModal(true);
  };

  const openEdit = (item: SiteContentItem) => {
    setEditingId(item.id);
    setForm({
      section: item.section,
      title: item.title,
      body: item.body,
      orderIndex: item.orderIndex,
      isActive: item.isActive,
    });
    const m = (item.metadata ?? {}) as Record<string, unknown>;
    setMeta(m);
    setAdvancedMode(false);
    setAdvancedJson(JSON.stringify(m, null, 2));
    setShowModal(true);
  };

  // Switch section in CREATE mode → reset metadata to that schema's defaults.
  const onSectionChange = (section: string) => {
    setForm((f) => ({ ...f, section }));
    setMeta(defaultMetaFor(section));
    setAdvancedJson('{}');
  };

  const setMetaField = (key: string, value: unknown) => {
    setMeta((m) => ({ ...m, [key]: value }));
  };

  // Toggle the raw-JSON escape hatch, syncing both directions.
  const toggleAdvanced = () => {
    if (!advancedMode) {
      setAdvancedJson(JSON.stringify(meta, null, 2));
      setAdvancedMode(true);
    } else {
      try {
        const parsed = JSON.parse(advancedJson || '{}');
        setMeta(parsed && typeof parsed === 'object' ? parsed : {});
        setAdvancedMode(false);
      } catch {
        showToast('Invalid JSON — fix it before switching back', 'error');
      }
    }
  };

  /** Build the final metadata object from the typed form (or the raw JSON). */
  const buildMetadata = (): Record<string, unknown> => {
    if (advancedMode) { return JSON.parse(advancedJson || '{}'); }
    const out: Record<string, unknown> = { ...meta }; // preserve unknown/legacy keys
    for (const f of schema?.fields ?? []) {
      const v = meta[f.key];
      if (f.type === 'number') {
        out[f.key] = v === '' || v === undefined ? f.default ?? 0 : Number(v);
      } else if (f.type === 'string-array') {
        const arr = Array.isArray(v) ? v.map(String) : [];
        out[f.key] = arr.map((s) => s.trim()).filter(Boolean);
      } else if (f.type === 'boolean') {
        out[f.key] = v === undefined ? Boolean(f.default) : Boolean(v);
      } else if ((v === undefined || v === '') && f.default !== undefined) {
        out[f.key] = f.default;
      }
    }
    return out;
  };

  const handleSave = async () => {
    if (!form.title || !form.body) {
      showToast(`${schema?.titleLabel ?? 'Title'} and ${schema?.bodyLabel ?? 'body'} are required`, 'error');
      return;
    }
    // Required typed fields
    for (const f of schema?.fields ?? []) {
      if (f.required && !meta[f.key] && !advancedMode) {
        showToast(`${f.label} is required`, 'error');
        return;
      }
    }
    let metadata: Record<string, unknown>;
    try {
      metadata = buildMetadata();
    } catch {
      showToast('Invalid JSON in advanced metadata', 'error');
      return;
    }

    try {
      if (editingId) {
        await adminApi.updateSiteContent(editingId, {
          title: form.title,
          body: form.body,
          metadata,
          orderIndex: form.orderIndex,
          isActive: form.isActive,
        });
        showToast('Content updated!', 'success');
      } else {
        await adminApi.createSiteContent({
          section: form.section,
          title: form.title,
          body: form.body,
          metadata,
          orderIndex: form.orderIndex,
          isActive: form.isActive,
        });
        showToast('Content created!', 'success');
      }
      setShowModal(false);
      setEditingId(null);
      fetchContent();
    } catch (err: any) {
      showToast(err.message || 'Failed to save', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) { return; }
    setIsDeleting(true);
    try {
      await adminApi.deleteSiteContent(confirmDelete.id);
      showToast('Content deleted', 'success');
      setConfirmDelete(null);
      fetchContent();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sections to render in the list: registry order (by group) + any legacy
  // sections present in data but not in the registry (so they stay manageable).
  const registrySections = GROUP_ORDER.flatMap((g) =>
    Object.values(SECTION_SCHEMAS).filter((s) => s.group === g).map((s) => s.section),
  );
  const extraSections = Array.from(new Set(siteContent.map((c) => c.section))).filter(
    (s) => !registrySections.includes(s),
  );
  const orderedSections = [...registrySections, ...extraSections];

  return (
    <div className="animate-fade-in">
      <div className="t-card t-border border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border flex justify-between items-center">
          <h3 className="text-xl font-bold t-text">Site Content Manager</h3>
          <button
            onClick={openCreate}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-md text-sm"
          >
            <Plus size={16} /> New Content
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="t-text-3">Loading content...</div></div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="t-status-danger text-sm">{loadError}</div>
            <button onClick={fetchContent} className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Retry
            </button>
          </div>
        ) : siteContent.length === 0 ? (
          <div className="flex items-center justify-center py-20"><div className="t-text-3">No content found</div></div>
        ) : (
          <div className="divide-y t-divide">
            {orderedSections.map((section) => {
              const items = siteContent.filter((c) => c.section === section);
              if (items.length === 0) { return null; }
              const label = SECTION_SCHEMAS[section]?.label ?? section;
              return (
                <div key={section} className="p-6">
                  <h4 className="text-sm font-bold t-text-2 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers size={14} />
                    {label} ({items.length})
                  </h4>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          item.isActive ? 't-card t-border' : 't-status-danger opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs t-text-3 font-mono">#{item.orderIndex}</span>
                            <p className="font-medium t-text truncate">{item.title}</p>
                            {!item.isActive && <span className="px-1.5 py-0.5 t-status-danger border text-xs font-bold rounded">Inactive</span>}
                          </div>
                          <p className="text-sm t-text-2 truncate mt-1">{item.body}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openEdit(item)} className="text-brand-600 hover:text-brand-500 text-sm font-medium">Edit</button>
                          <button onClick={() => setConfirmDelete(item)} className="text-sm font-medium hover:opacity-70" style={{ color: 'var(--status-danger-text)' }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Content"
        message={`Are you sure you want to delete "${confirmDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={isDeleting}
      />

      {/* Content Create/Edit Modal */}
      <AdminModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Content' : 'New Content'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Section — create-only (section is immutable on update) */}
          {editingId ? (
            <div>
              <label className="block text-sm font-medium t-text-2 mb-2">Section</label>
              <div className="t-input-bg t-border border rounded-lg p-2.5 t-text-2 text-sm">
                {schema?.label ?? form.section}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium t-text-2 mb-2">Section *</label>
              <select value={form.section} onChange={(e) => onSectionChange(e.target.value)} className={inputCls}>
                {GROUP_ORDER.map((group) => {
                  const inGroup = CREATE_SECTIONS.filter((s) => s.group === group);
                  if (inGroup.length === 0) { return null; }
                  return (
                    <optgroup key={group} label={group}>
                      {inGroup.map((s) => (
                        <option key={s.section} value={s.section}>{s.label}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
          )}

          {/* Core title + body, with section-aware labels */}
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">{schema?.titleLabel ?? 'Title'} *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
              placeholder={schema?.titlePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium t-text-2 mb-2">{schema?.bodyLabel ?? 'Body'} *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={schema?.bodyMultiline === false ? 2 : 4}
              className={inputCls}
              placeholder={schema?.bodyPlaceholder}
            />
          </div>

          {/* Metadata — typed sub-form or raw JSON */}
          {(schema?.fields.length ?? 0) > 0 || advancedMode ? (
            <div className="space-y-4 pt-2 border-t t-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold t-text-2">Details</span>
                <button
                  type="button"
                  onClick={toggleAdvanced}
                  className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-500 font-medium"
                >
                  {advancedMode ? <><FormInput size={12} /> Form</> : <><Code2 size={12} /> Advanced (JSON)</>}
                </button>
              </div>
              {advancedMode ? (
                <textarea
                  value={advancedJson}
                  onChange={(e) => setAdvancedJson(e.target.value)}
                  rows={6}
                  className={`${inputCls} font-mono text-xs`}
                  placeholder='{"key": "value"}'
                />
              ) : (
                <div className="space-y-4">
                  {schema?.fields.map((f) => (
                    <FieldInput key={f.key} field={f} value={meta[f.key]} onChange={(v) => setMetaField(f.key, v)} />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t t-border">
            <div>
              <label className="block text-sm font-medium t-text-2 mb-2">Order Index</label>
              <input
                type="number"
                value={form.orderIndex}
                onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-brand-600 t-border rounded focus:ring-brand-500"
                />
                <span className="text-sm t-text">Active</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { setShowModal(false); setEditingId(null); }}
            className="flex-1 t-card hover:bg-[var(--surface-hover)] t-border border t-text py-2 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg font-medium transition"
          >
            {editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </AdminModal>
    </div>
  );
};
