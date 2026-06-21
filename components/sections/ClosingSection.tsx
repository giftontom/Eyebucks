import { Plus, ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { FadeIn, STAGGER_MS } from '../FadeIn';
import { logger } from '../../utils/logger';

interface FAQItem {
  q: string;
  a: string;
}

interface ClosingSectionProps {
  faqs: FAQItem[];
}

export const ClosingSection: React.FC<ClosingSectionProps> = ({ faqs }) => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Email capture state
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      // TODO: Replace with newsletter Edge Function when wired up.
      await new Promise(resolve => setTimeout(resolve, 600));
      logger.info('[ClosingSection] Subscription:', trimmed);
      setStatus('success');
      setEmail('');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  }, [email]);

  return (
    <section className="py-20 md:py-28 t-bg relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <span className="t-eyebrow mb-4 inline-block">Ready when you are</span>
            <h2 className="t-h2 t-text mb-4">Questions, answered. Then start shooting.</h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* FAQ — left 3 cols */}
          <div className="lg:col-span-3 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <FadeIn key={`${faq.q}-${idx}`} delay={idx * STAGGER_MS}>
                  <div
                    className={`t-card border rounded-2xl overflow-hidden transition-all duration-300 ${
                      isOpen ? 'border-brand-500/40 shadow-(--shadow-elevated)' : 't-border hover:border-brand-500/20'
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-(--surface-hover) transition text-left gap-4"
                      aria-expanded={isOpen}
                    >
                      <h3 className={`t-h4 transition-colors ${isOpen ? 'text-brand-400' : 't-text'}`}>{faq.q}</h3>
                      <span
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          isOpen
                            ? 'bg-brand-500/15 border-brand-500/40 text-brand-400 rotate-45'
                            : 't-bg-alt t-border t-text-3'
                        }`}
                      >
                        <Plus size={18} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 md:px-6 pb-6 t-body t-text-2 animate-slide-in">
                        {faq.a}
                      </div>
                    )}
                  </div>
                </FadeIn>
              );
            })}
          </div>

          {/* CTA + Email capture — right 2 cols, sticky on desktop */}
          <div className="lg:col-span-2">
            <FadeIn delay={2 * STAGGER_MS}>
              <div className="lg:sticky lg:top-24">
                {/* Combined CTA + email card with subtle brand glow */}
                <div className="relative t-card t-border border rounded-3xl overflow-hidden backdrop-blur-xl">
                  {/* Top accent gradient stripe */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent" />
                  <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

                  {/* Primary CTA */}
                  <div className="relative p-8 text-center">
                    <h3 className="text-3xl font-black mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">Start today.</span>
                    </h3>
                    <p className="t-body t-text-2 mb-6">
                      Lifetime access. 30-day money back. The camera is rolling.
                    </p>
                    <button
                      onClick={() => navigate('/courses')}
                      data-live
                      className="group cta-sheen inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-lg transition-all shadow-(--shadow-brand) hover:-translate-y-0.5"
                    >
                      Get Full Access
                      <ArrowRight size={20} className="transition-transform group-live:translate-x-1" />
                    </button>
                    <div className="mt-5 flex items-center justify-center gap-4 t-caption">
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-(color:--status-success-text)" /> 30-Day Guarantee</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-(color:--status-success-text)" /> Lifetime Access</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative mx-8 h-px bg-gradient-to-r from-transparent via-(--border) to-transparent" />

                  {/* Email capture — visually attached, lower-priority styling */}
                  <div className="relative p-6">
                    {status === 'success' ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-(color:--status-success-text) flex-shrink-0" />
                        <div>
                          <p className="font-bold t-text text-sm">You're on the list</p>
                          <p className="t-caption">Tips, free resources, and course updates.</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail size={14} className="text-brand-500" />
                          <p className="text-sm font-bold t-text">Not ready? Stay close.</p>
                        </div>
                        <p className="t-caption mb-3">Free filmmaking tips and early access to new courses.</p>
                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (status === 'error') {setStatus('idle');} }}
                            placeholder="your@email.com"
                            aria-label="Email address"
                            className="flex-1 px-4 py-2.5 rounded-lg t-border border t-input-bg t-text placeholder:text-(color:--text-3) outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition text-sm"
                          />
                          <button
                            type="submit"
                            disabled={status === 'submitting'}
                            className="px-4 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm transition shrink-0"
                          >
                            {status === 'submitting' ? '…' : 'Subscribe'}
                          </button>
                        </form>
                        {status === 'error' && errorMsg && (
                          <p className="t-caption text-(color:--status-danger-text) mt-2">{errorMsg}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
};
