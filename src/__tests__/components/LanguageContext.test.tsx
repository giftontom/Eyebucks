import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    user: null as null | { preferredLanguage?: string | null },
    updatePreferredLanguage: vi.fn(),
  },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import { LanguageProvider, useLanguage } from '../../../context/LanguageContext';

const Consumer = () => {
  const { language, setLanguage, toggleLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <button onClick={() => setLanguage('ML')}>SetML</button>
      <button onClick={toggleLanguage}>Toggle</button>
    </div>
  );
};

function setNavigatorLanguage(value: string) {
  Object.defineProperty(window.navigator, 'language', { value, configurable: true });
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuth.user = null;
    mockAuth.updatePreferredLanguage = vi.fn().mockResolvedValue(undefined);
    setNavigatorLanguage('en-US');
  });

  it('defaults to EN when no saved choice and the browser is English', () => {
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('EN');
  });

  it('defaults to ML when the browser language is Malayalam', () => {
    setNavigatorLanguage('ml-IN');
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('ML');
  });

  it('prefers a saved localStorage choice over the browser default', () => {
    setNavigatorLanguage('ml-IN');
    localStorage.setItem('eyebuckz_lang', 'EN');
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('EN');
  });

  it('persists the chosen language to localStorage', async () => {
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'SetML' }));
    expect(screen.getByTestId('lang').textContent).toBe('ML');
    expect(localStorage.getItem('eyebuckz_lang')).toBe('ML');
  });

  it('toggles between EN and ML', async () => {
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('EN');
    await userEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('lang').textContent).toBe('ML');
  });

  it('syncs the choice to the user profile when signed in', async () => {
    mockAuth.user = { preferredLanguage: null };
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'SetML' }));
    expect(mockAuth.updatePreferredLanguage).toHaveBeenCalledWith('ML');
  });

  it('seeds from the user profile when the device has no explicit choice', () => {
    mockAuth.user = { preferredLanguage: 'ML' };
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('ML');
  });

  it('does NOT let the profile override an explicit device choice', () => {
    localStorage.setItem('eyebuckz_lang', 'EN');
    mockAuth.user = { preferredLanguage: 'ML' };
    render(<LanguageProvider><Consumer /></LanguageProvider>);
    expect(screen.getByTestId('lang').textContent).toBe('EN');
  });
});
