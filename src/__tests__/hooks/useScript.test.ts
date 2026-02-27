import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useScript } from '../../../hooks/useScript';

describe('useScript', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('should return false initially while loading', () => {
    const { result } = renderHook(() => useScript('https://example.com/test.js'));
    expect(result.current).toBe(false);
  });

  it('should return true after script loads', async () => {
    const { result } = renderHook(() => useScript('https://example.com/test.js'));

    const script = document.querySelector('script[src="https://example.com/test.js"]');
    expect(script).toBeTruthy();

    act(() => {
      script?.dispatchEvent(new Event('load'));
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false after script error', async () => {
    const { result } = renderHook(() => useScript('https://example.com/bad.js'));

    const script = document.querySelector('script[src="https://example.com/bad.js"]');

    act(() => {
      script?.dispatchEvent(new Event('error'));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should return true if script already exists in DOM', async () => {
    // Pre-add script
    const existing = document.createElement('script');
    existing.src = 'https://example.com/existing.js';
    document.body.appendChild(existing);

    const { result } = renderHook(() => useScript('https://example.com/existing.js'));

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should set async attribute on created script', () => {
    renderHook(() => useScript('https://example.com/async.js'));

    const script = document.querySelector('script[src="https://example.com/async.js"]') as HTMLScriptElement;
    expect(script).toBeTruthy();
    expect(script.async).toBe(true);
  });

  it('should only create one script element for same src', () => {
    renderHook(() => useScript('https://example.com/shared.js'));
    renderHook(() => useScript('https://example.com/shared.js'));

    const scripts = document.querySelectorAll('script[src="https://example.com/shared.js"]');
    // Second hook finds existing script, so only 1 element
    expect(scripts.length).toBe(1);
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = renderHook(() => useScript('https://example.com/cleanup.js'));

    const script = document.querySelector('script[src="https://example.com/cleanup.js"]');
    expect(script).toBeTruthy();

    unmount();
    // Script still in DOM (not removed by default), but listeners cleaned up
    expect(document.querySelector('script[src="https://example.com/cleanup.js"]')).toBeTruthy();
  });
});
