import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

import { useAuth } from './AuthContext';

import type { CourseLanguage } from '../types';

const LS_KEY = 'eyebuckz_lang';

interface LanguageContextValue {
  /** The active storefront content language. */
  language: CourseLanguage;
  /** Set the language explicitly (persists to localStorage + the user's profile when signed in). */
  setLanguage: (lang: CourseLanguage) => void;
  /** Flip between EN and ML. */
  toggleLanguage: () => void;
}

function isValidLang(v: string | null | undefined): v is CourseLanguage {
  return v === 'EN' || v === 'ML';
}

/** Read an explicit device choice from localStorage, if any. */
function readStoredChoice(): CourseLanguage | null {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return isValidLang(saved) ? saved : null;
  } catch {
    return null; // localStorage unavailable (privacy mode)
  }
}

/** Device fallback when neither an explicit choice nor a profile preference exists. */
function deviceDefaultLanguage(): CourseLanguage {
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ml')) {
    return 'ML';
  }
  return 'EN';
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'EN',
  setLanguage: () => {},
  toggleLanguage: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updatePreferredLanguage } = useAuth();

  // An explicit choice on THIS device (localStorage or a tap this session). It
  // always wins. When absent, a signed-in user's saved preference seeds the
  // default; otherwise we fall back to the browser language. Deriving (rather
  // than syncing via an effect) keeps the precedence rules in one place and
  // avoids cascading re-renders.
  const [override, setOverride] = useState<CourseLanguage | null>(() => readStoredChoice());

  const rawPref = user?.preferredLanguage;
  const profilePref: CourseLanguage | null = isValidLang(rawPref) ? rawPref : null;

  const language = useMemo<CourseLanguage>(
    () => override ?? profilePref ?? deviceDefaultLanguage(),
    [override, profilePref],
  );

  const setLanguage = useCallback((lang: CourseLanguage) => {
    setOverride(lang);
    try { localStorage.setItem(LS_KEY, lang); } catch { /* ignore */ }
    // Fire-and-forget profile sync; localStorage already holds this device's
    // source of truth, so a failed write must not block the UI.
    if (user) {
      updatePreferredLanguage(lang).catch(() => { /* non-blocking */ });
    }
  }, [user, updatePreferredLanguage]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'EN' ? 'ML' : 'EN');
  }, [language, setLanguage]);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language, setLanguage, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
