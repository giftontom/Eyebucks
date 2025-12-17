import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Phone, Lock, AlertTriangle } from 'lucide-react';

export const GapCheckModal: React.FC = () => {
  const { isGapCheckRequired, updatePhoneNumber, logout } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isGapCheckRequired) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // E.164 Validation Regex (Module 2 Requirement)
    // Starts with +, followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;

    if (!e164Regex.test(phone)) {
      setError('Please enter a valid E.164 number (e.g., +15550000000).');
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePhoneNumber(phone);
    } catch (err) {
      setError('Failed to update. ensure format is correct.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl shadow-2xl max-w-md w-full p-8 animate-fade-in relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-red-500" />

        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
            <Lock className="text-yellow-500" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Final Step Required</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            To ensure account security and enable 2FA recovery, Eyebuckz requires a verified mobile number for all premium accounts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">Mobile Number (E.164 Format)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-gray-500" size={18} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15550000000"
                className="w-full bg-brand-dark-bg border border-brand-dark-border rounded-lg py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition font-mono"
              />
            </div>
            {error && (
                <div className="flex items-center gap-2 mt-2 text-red-500 text-xs">
                    <AlertTriangle size={12} />
                    <span>{error}</span>
                </div>
            )}
            <p className="text-xs text-gray-600 mt-2">Format: +[CountryCode][Number] without spaces.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-lg transition duration-200 disabled:opacity-50 shadow-lg shadow-brand-500/20"
          >
            {isSubmitting ? 'Verifying...' : 'Secure Account & Continue'}
          </button>
        </form>

        <button 
          onClick={logout}
          className="w-full mt-6 text-gray-500 text-sm hover:text-white transition"
        >
          Logout & Return to Home
        </button>
      </div>
    </div>
  );
};