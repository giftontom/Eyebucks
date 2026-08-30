import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useVisualViewportInset } from '../../../hooks/useVisualViewportInset';

/** Minimal stand-in for window.visualViewport with manual event dispatch. */
function fakeViewport(height: number, offsetTop = 0) {
  const listeners: Record<string, Array<() => void>> = { resize: [], scroll: [] };
  return {
    height,
    offsetTop,
    addEventListener: (t: string, fn: () => void) => { (listeners[t] ||= []).push(fn); },
    removeEventListener: (t: string, fn: () => void) => {
      listeners[t] = (listeners[t] || []).filter(f => f !== fn);
    },
    fire: (t: string) => (listeners[t] || []).forEach(f => f()),
    listenerCount: () => listeners.resize.length + listeners.scroll.length,
  };
}

const inset = () => document.documentElement.style.getPropertyValue('--vv-bottom-inset');

describe('useVisualViewportInset', () => {
  let raf: typeof requestAnimationFrame;

  beforeEach(() => {
    raf = window.requestAnimationFrame;
    // run frames synchronously so assertions don't race the scheduler
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 1; }) as typeof requestAnimationFrame;
    window.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    document.documentElement.style.removeProperty('--vv-bottom-inset');
  });

  afterEach(() => {
    window.requestAnimationFrame = raf;
    // @ts-expect-error test cleanup
    delete window.visualViewport;
  });

  it('does nothing when visualViewport is unavailable', () => {
    // @ts-expect-error simulating an older browser
    window.visualViewport = undefined;
    renderHook(() => useVisualViewportInset());
    expect(inset()).toBe('');
  });

  it('reports no inset when the visible viewport fills the layout viewport', () => {
    // @ts-expect-error test double
    window.visualViewport = fakeViewport(800);
    renderHook(() => useVisualViewportInset());
    expect(inset()).toBe('0px');
  });

  /** The toolbar case: 40px of layout viewport is not actually visible. */
  it('reports the gap when the browser toolbar covers the bottom', () => {
    // @ts-expect-error test double
    window.visualViewport = fakeViewport(760);
    renderHook(() => useVisualViewportInset());
    expect(inset()).toBe('40px');
  });

  it('accounts for the visual viewport being scrolled within the layout one', () => {
    // @ts-expect-error test double
    window.visualViewport = fakeViewport(700, 30);
    renderHook(() => useVisualViewportInset());
    expect(inset()).toBe('70px');
  });

  it('never reports a negative inset', () => {
    // @ts-expect-error test double
    window.visualViewport = fakeViewport(900);
    renderHook(() => useVisualViewportInset());
    expect(inset()).toBe('0px');
  });

  it('updates when the viewport resizes', () => {
    const vv = fakeViewport(800);
    // @ts-expect-error test double
    window.visualViewport = vv;
    renderHook(() => useVisualViewportInset());
    expect(inset()).toBe('0px');
    vv.height = 760;
    vv.fire('resize');
    expect(inset()).toBe('40px');
  });

  it('rounds sub-pixel values so the blurred bar is not repainted for nothing', () => {
    // @ts-expect-error test double
    window.visualViewport = fakeViewport(759.6);
    renderHook(() => useVisualViewportInset());
    expect(inset()).toBe('40px');
  });

  it('detaches its listeners and clears the variable on unmount', () => {
    const vv = fakeViewport(760);
    // @ts-expect-error test double
    window.visualViewport = vv;
    const { unmount } = renderHook(() => useVisualViewportInset());
    expect(vv.listenerCount()).toBe(2);
    unmount();
    expect(vv.listenerCount()).toBe(0);
    expect(inset()).toBe('');
  });
});
