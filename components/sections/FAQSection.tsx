import { X, Plus } from 'lucide-react';
import React, { useState } from 'react';

import { FadeIn } from '../FadeIn';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
}

export const FAQSection: React.FC<FAQSectionProps> = ({ faqs }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="py-24 t-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <h2 className="text-3xl font-bold t-text mb-12 text-center" style={{ fontFamily: 'var(--font-display)' }}>Frequently Asked Questions</h2>
        </FadeIn>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <FadeIn key={idx} delay={idx * 50}>
              <div className="t-card t-border border rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/20 group">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 hover:bg-black/5 dark:hover:bg-white/5 transition text-left"
                >
                  <h3 className="font-bold t-text text-lg group-hover:text-brand-400 transition-colors">{faq.q}</h3>
                  {openFaq === idx ? <X size={24} className="t-text-3 shrink-0" /> : <Plus size={24} className="t-text-3 shrink-0" />}
                </button>
                {openFaq === idx && (
                  <div className="p-6 pt-0 border-t t-border t-text-2 leading-relaxed text-lg animate-slide-in">
                    {faq.a}
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};
