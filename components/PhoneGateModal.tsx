import React, { useState } from 'react';
import { Phone, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export const PhoneGateModal: React.FC = () => {
  const { updatePhoneNumber } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = phone.trim();
    if (!E164_REGEX.test(trimmed)) {
      setError('Enter a valid phone number (e.g. +919876543210)');
      return;
    }

    try {
      setSaving(true);
      await updatePhoneNumber(trimmed);
    } catch (err: any) {
      setError(err.message || 'Failed to save phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <div className="flex items-center justify-center w-14 h-14 bg-brand-100 rounded-full mx-auto mb-5">
          <Phone size={28} className="text-brand-600" />
        </div>

        <h2 className="text-2xl font-bold text-neutral-900 text-center mb-2">
          Add Your Phone Number
        </h2>
        <p className="text-neutral-500 text-center text-sm mb-6">
          A verified phone number is required to access the platform. This helps us keep your account secure.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone-gate-input" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Phone Number
            </label>
            <input
              id="phone-gate-input"
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(null); }}
              placeholder="+919876543210"
              className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              autoFocus
              disabled={saving}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !phone.trim()}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <p className="text-xs text-neutral-400 text-center mt-4">
          Use international format with country code (e.g. +91 for India)
        </p>
      </div>
    </div>
  );
};
