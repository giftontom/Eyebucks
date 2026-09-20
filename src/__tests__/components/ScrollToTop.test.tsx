import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockNavigationType } = vi.hoisted(() => ({ mockNavigationType: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigationType: () => mockNavigationType() };
});

import { ScrollToTop } from '../../../components/ScrollToTop';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ScrollToTop />
    </MemoryRouter>,
  );

describe('ScrollToTop', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigationType.mockReturnValue('PUSH');
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('without a hash', () => {
    it('scrolls to the top on a PUSH navigation', () => {
      renderAt('/courses');
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    });

    it('leaves the scroll position alone on POP, so back/forward restores it', () => {
      mockNavigationType.mockReturnValue('POP');
      renderAt('/courses');
      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('with a hash', () => {
    it('scrolls a target that is already in the DOM into view', async () => {
      const el = document.createElement('section');
      el.id = 'pricing';
      el.scrollIntoView = vi.fn();
      document.body.appendChild(el);

      renderAt('/#pricing');

      await waitFor(() => expect(el.scrollIntoView).toHaveBeenCalled());
      expect(scrollTo).not.toHaveBeenCalled();
    });

    /**
     * The regression this file exists for. Every route is React.lazy, so on a
     * cold load of a deep link the section does not exist yet — and the old
     * implementation both bailed out on POP (the navigation type of an initial
     * load) and only looked once. The CMS "View on site" links therefore always
     * dumped the admin at the top of the page.
     */
    it('waits for a target that mounts after the lazy route resolves', async () => {
      mockNavigationType.mockReturnValue('POP');
      renderAt('/#how-it-works');

      // Nothing to scroll to yet, and crucially it must not give up.
      expect(scrollTo).not.toHaveBeenCalled();

      const el = document.createElement('section');
      el.id = 'how-it-works';
      el.scrollIntoView = vi.fn();
      document.body.appendChild(el);

      await waitFor(() => expect(el.scrollIntoView).toHaveBeenCalled());
    });

    it('handles a percent-encoded hash', async () => {
      const el = document.createElement('section');
      el.id = 'value props';
      el.scrollIntoView = vi.fn();
      document.body.appendChild(el);

      renderAt('/#value%20props');

      await waitFor(() => expect(el.scrollIntoView).toHaveBeenCalled());
    });

    it('never falls back to scrolling to the top when the target is missing', async () => {
      renderAt('/#nope');
      await new Promise((r) => setTimeout(r, 120));
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('stops polling once unmounted', async () => {
      const { unmount } = renderAt('/#later');
      unmount();

      const el = document.createElement('section');
      el.id = 'later';
      el.scrollIntoView = vi.fn();
      document.body.appendChild(el);

      await new Promise((r) => setTimeout(r, 120));
      expect(el.scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
