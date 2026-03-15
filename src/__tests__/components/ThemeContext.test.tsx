import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ThemeProvider, useTheme } from '../../../context/ThemeContext';

// ThemeConsumer to inspect context values
const ThemeConsumer = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{isDark ? 'dark' : 'light'}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    // Reset matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  it('defaults to light when localStorage and matchMedia say light', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('reads saved dark theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('reads saved light theme from localStorage', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('toggles theme from light to dark on button click', async () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('persists theme to localStorage on toggle', async () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('adds .dark class to documentElement when isDark=true', async () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('uses system dark preference when no localStorage entry', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>);
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});
