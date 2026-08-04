import { Languages, ChevronRight } from 'lucide-react';
import React from 'react';

import { useLanguage } from '../context/LanguageContext';
import { COURSE_LANGUAGE_LABELS } from '../types';

interface LanguageToggleProps {
  /** `icon` = compact pill for the desktop nav; `full` = full-width row for the mobile menu. */
  variant?: 'icon' | 'full';
}

/**
 * Switches the storefront content language (English ⇄ Malayalam). The catalog
 * lists only courses in the selected language. App chrome stays in English.
 */
export const LanguageToggle: React.FC<LanguageToggleProps> = ({ variant = 'icon' }) => {
  const { language, toggleLanguage } = useLanguage();
  const current = COURSE_LANGUAGE_LABELS[language];
  const nextLabel = language === 'EN' ? COURSE_LANGUAGE_LABELS.ML.label : COURSE_LANGUAGE_LABELS.EN.label;

  if (variant === 'full') {
    return (
      <button
        onClick={toggleLanguage}
        className="w-full mb-4 flex items-center justify-between p-4 rounded-xl t-card hover:bg-[var(--surface-hover)] transition t-border border t-text"
        aria-label={`Switch language to ${nextLabel}`}
      >
        <span className="text-base font-medium t-text flex items-center gap-2">
          <Languages size={20} aria-hidden="true" />
          Language:&nbsp;<span lang={language === 'ML' ? 'ml' : undefined}>{current.label}</span>
        </span>
        <ChevronRight size={20} className="t-text-3" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className="px-2.5 py-2 rounded-full hover:bg-[var(--surface-hover)] t-text-2 hover:t-text transition flex items-center gap-1.5 text-sm font-bold"
      aria-label={`Switch language to ${nextLabel}. Current language: ${current.label}`}
      title={`Language: ${current.label} — switch to ${nextLabel}`}
    >
      <Languages size={18} aria-hidden="true" />
      <span aria-hidden="true">{current.short}</span>
    </button>
  );
};
LanguageToggle.displayName = 'LanguageToggle';
