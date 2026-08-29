import { Plus, Layers, Code2, FormInput, ExternalLink, MapPin, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { ImageUpload, VideoField } from '../../components';
import { adminApi } from '../../services/api/admin.api';
import { logger } from '../../utils/logger';

import { useAdmin } from './AdminContext';
import { AdminModal } from './components/AdminModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  SECTION_SCHEMAS,
  CREATE_SECTIONS,
  GROUP_ORDER,
  PAGE_ORDER,
  defaultMetaFor,
  siteLinkFor,
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
    case 'video':
      return (
        <VideoField
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          folder={field.folder ?? 'hero'}
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

  // Creating a *second* row in a singleton section is the classic "I edited the
  // CMS but the site didn't change" trap: the storefront reads items[0] ordered
  // by order_index, so a duplicate at the same order wins or loses at random.
  const singletonRows = schema?.singleton
    ? siteContent.filter((c) => c.section === form.section)
    : [];
  const singletonConflict = !editingId && singletonRows.length > 0;

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

  /**
   * Open the create modal, optionally pre-picked to a section.
   *
   * The "Add content" button on an empty section passes its own key so the
   * admin does not have to re-find it in the dropdown they already failed to
   * find it in.
   */
  const openCreate = (section = 'faq') => {
    setEditingId(null);
    setForm({ section, title: '', body: '', orderIndex: 0, isActive: true });
    setMeta(defaultMetaFor(section));
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
    const missing: string[] = [];
    if (schema?.coreTitle !== false && !form.title) { missing.push(schema?.titleLabel ?? 'Title'); }
    if (schema?.coreBody !== false && !form.body) { missing.push(schema?.bodyLabel ?? 'Body'); }
    if (missing.length > 0) {
      showToast(`${missing.join(' and ')} required`, 'error');
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
  // Walk the page top to bottom. Anything in the registry that PAGE_ORDER
  // forgot still gets listed (after the ordered ones) rather than disappearing.
  const registrySections = [
    ...PAGE_ORDER.filter((s) => SECTION_SCHEMAS[s]),
    ...Object.values(SECTION_SCHEMAS)
      .map((s) => s.section)
      .filter((s) => !PAGE_ORDER.includes(s)),
  ];
  // 'settings' rows are owned by the Settings page, not the content editor — hide them.
  const extraSections = Array.from(new Set(siteContent.map((c) => c.section))).filter(
    (s) => !registrySections.includes(s) && s !== 'settings',
  );
  const orderedSections = [...registrySections, ...extraSections];

  return (
    <div className="animate-fade-in">
      <div className="t-card t-border border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b t-border flex justify-between items-center">
          <h3 className="text-xl font-bold t-text">Site Content Manager</h3>
          <button
            onClick={() => openCreate()}
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
        ) : (
          <div className="divide-y t-divide">
            {orderedSections.map((section) => {
              const items = siteContent.filter((c) => c.section === section);
              const sectionSchema = SECTION_SCHEMAS[section];
              // A section with no rows used to be skipped entirely, which is
              // precisely why an admin hunting for on-screen text could not
              // find it: the site was rendering built-in fallback copy from a
              // section that the CMS refused to admit existed. List every known
              // section and say what state it is in.
              if (items.length === 0 && !sectionSchema) { return null; }
              const label = sectionSchema?.label ?? section;
              const siteLink = siteLinkFor(section);
              return (
                <div key={section} className="p-6">
                  <h4 className="text-sm font-bold t-text-2 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Layers size={14} />
                    {label} ({items.length})
                    {items.length === 0 && (
                      <span className="normal-case tracking-normal font-medium t-text-3">
                        — using built-in text
                      </span>
                    )}
                  </h4>
                  {/* Section keys are internal names — spell out which band of
                      the live site these rows drive, and link straight to it. */}
                  {sectionSchema?.where && (
                    <p className="text-xs t-text-3 flex items-start gap-1.5">
                      <MapPin size={12} className="mt-0.5 shrink-0" />
                      <span>
                        {sectionSchema.where}
                        {siteLink && (
                          <a
                            href={siteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 text-brand-600 hover:text-brand-500 font-medium"
                          >
                            View on site <ExternalLink size={10} />
                          </a>
                        )}
                      </span>
                    </p>
                  )}
                  {items.length === 0 && sectionSchema && (
                    <div className="mt-4 rounded-lg border border-dashed t-border p-4 flex items-center justify-between gap-4">
                      <p className="text-sm t-text-3">
                        Nothing here yet, so the site shows the wording built into the page.
                        Add a row to take control of it.
                      </p>
                      <button
                        onClick={() => openCreate(section)}
                        className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-500"
                      >
                        <Plus size={14} /> Add content
                      </button>
                    </div>
                  )}
                  <div className="space-y-3 mt-4">
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

          {/* "Which part of the site am I editing?" — the question the section
              key alone never answers. Mirrors the hint on the list page. */}
          {schema?.where && (
            <p className="text-xs t-text-3 -mt-1 flex items-start gap-1.5">
              <MapPin size={12} className="mt-0.5 shrink-0" />
              <span>
                {schema.where}
                {siteLinkFor(form.section) && (
                  <a
                    href={siteLinkFor(form.section) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-brand-600 hover:text-brand-500 font-medium"
                  >
                    View on site <ExternalLink size={10} />
                  </a>
                )}
              </span>
            </p>
          )}

          {schema?.singleton && !singletonConflict && (
            <p className="text-xs t-text-3 -mt-1">
              Single-row section — only the first row (lowest order) is shown on the site.
            </p>
          )}
          {singletonConflict && (
            <div className="t-status-danger border rounded-lg p-3 text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  “{schema?.label}” already has {singletonRows.length === 1 ? 'a row' : `${singletonRows.length} rows`}.
                </p>
                <p className="mt-1">
                  Only the first row is shown on the site, so a new one here will most likely
                  change nothing. Edit the existing row instead.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const existing = [...singletonRows].sort((a, b) => a.orderIndex - b.orderIndex)[0];
                    if (existing) { openEdit(existing); }
                  }}
                  className="mt-2 font-semibold underline hover:opacity-80"
                >
                  Edit the existing row
                </button>
              </div>
            </div>
          )}

          {/* Core title + body, with section-aware labels (some singletons omit them) */}
          {schema?.coreTitle !== false && (
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
          )}
          {schema?.coreBody !== false && (
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
          )}

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
