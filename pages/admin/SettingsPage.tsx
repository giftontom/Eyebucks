import { Settings, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { adminApi } from '../../services/api/admin.api';

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'boolean' | 'email';
  value: string;
}

const DEFAULT_SETTINGS: SettingField[] = [
  {
    key: 'maintenance_mode',
    label: 'Maintenance Mode',
    description: 'When enabled, displays a maintenance banner to all users.',
    type: 'boolean',
    value: 'false',
  },
  {
    key: 'featured_course_id',
    label: 'Featured Course ID',
    description: 'Course ID to highlight on the storefront hero section. Leave empty to use the default.',
    type: 'text',
    value: '',
  },
  {
    key: 'support_email',
    label: 'Support Email',
    description: 'Email address shown on the Contact and Terms pages.',
    type: 'email',
    value: 'support@eyebuckz.com',
  },
  {
    key: 'announcement_banner',
    label: 'Announcement Banner',
    description: 'Text shown in a banner at the top of every page. Leave empty to hide.',
    type: 'text',
    value: '',
  },
];

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingField[]>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { items } = await adminApi.getSiteContent();
        // Find settings stored in the 'settings' section
        const settingsItems = items.filter(i => i.section === 'settings');
        setSettings(prev => prev.map(field => {
          const stored = settingsItems.find(i => i.title === field.key);
          return stored ? { ...field, value: stored.body } : field;
        }));
      } catch {
        // Non-fatal — use defaults
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => prev.map(f => f.key === key ? { ...f, value } : f));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      // Upsert each setting as a site_content row in section='settings'
      const { items } = await adminApi.getSiteContent();
      const existing = items.filter(i => i.section === 'settings');

      for (const field of settings) {
        const stored = existing.find(i => i.title === field.key);
        if (stored) {
          await adminApi.updateSiteContent(stored.id, { body: field.value });
        } else {
          await adminApi.createSiteContent({
            section: 'settings',
            title: field.key,
            body: field.value,
            isActive: true,
          });
        }
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings size={24} className="text-brand-600" />
        <div>
          <h1 className="text-2xl font-bold t-text">Site Settings</h1>
          <p className="text-sm t-text-2 mt-0.5">Manage site-wide configuration without a code deploy.</p>
        </div>
      </div>

      <div className="space-y-6">
        {settings.map((field) => (
          <div key={field.key} className="t-card t-border border rounded-xl p-5">
            <label className="block">
              <span className="text-sm font-semibold t-text">{field.label}</span>
              <p className="text-xs t-text-2 mt-0.5 mb-3">{field.description}</p>

              {field.type === 'boolean' ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value === 'true'}
                    onClick={() => handleChange(field.key, field.value === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      field.value === 'true' ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        field.value === 'true' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm t-text-2">{field.value === 'true' ? 'Enabled' : 'Disabled'}</span>
                </div>
              ) : (
                <input
                  type={field.type === 'email' ? 'email' : 'text'}
                  value={field.value}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm t-bg t-border border rounded-lg t-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder={field.type === 'email' ? 'email@example.com' : 'Leave empty to disable'}
                />
              )}
            </label>
          </div>
        ))}
      </div>

      {saveStatus === 'error' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-500">
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}

      {saveStatus === 'success' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-green-500">
          <CheckCircle2 size={16} />
          Settings saved successfully.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-6 flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};
