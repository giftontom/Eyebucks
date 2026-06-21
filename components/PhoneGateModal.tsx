import { Phone, Loader2, AlertCircle, X } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useAuth } from '../context/AuthContext';

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

interface PhoneGateModalProps {
  onClose?: () => void;
}

export const PhoneGateModal: React.FC<PhoneGateModalProps> = ({ onClose }) => {
  const { updatePhoneNumber } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = 'phone-gate-heading';

  // Focus trap: keep Tab within the modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Focus the input on mount
    inputRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      ref={modalRef}
    >
      <div className="t-card t-border border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        {/* Close button — only shown when onClose is provided */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--surface-hover)] t-text-2 hover:t-text transition"
            aria-label="Close phone number dialog"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex items-center justify-center w-14 h-14 bg-brand-500/10 rounded-full mx-auto mb-5">
          <Phone size={28} className="text-brand-500" />
        </div>

        <h2 id={headingId} className="t-h3 t-text text-center mb-2">
          Add Your Phone Number
        </h2>
        <p className="t-caption text-center mb-6">
          A verified phone number is required to complete checkout. This helps us keep your account secure.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone-gate-input" className="block t-caption t-text mb-1.5">
              Phone Number
            </label>
            <input
              ref={inputRef}
              id="phone-gate-input"
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(null); }}
              placeholder="+919876543210"
              className="t-input-bg t-text t-border w-full px-4 py-3 border rounded-lg placeholder:text-[color:var(--text-3)] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
              autoFocus
              disabled={saving}
            />
          </div>

          {error && (
            <div className="t-status-danger flex items-start gap-2 text-sm border rounded-lg p-3" role="alert">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !phone.trim()}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-[var(--shadow-brand)]"
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

          {!onClose && (
            <button
              type="button"
              onClick={() => {
                // Allow user to skip phone entry — just close the gate
                // The modal will re-appear on next checkout since phone_e164 is still empty
                window.location.href = '/dashboard';
              }}
              className="w-full py-2.5 text-sm t-text-2 hover:t-text font-medium transition"
            >
              Skip for now
            </button>
          )}
        </form>

        <p className="t-caption text-center mt-4">
          Use international format with country code (e.g. +91 for India)
        </p>
      </div>
    </div>
  );
};
