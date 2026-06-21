import React, { useRef } from 'react';

import { useInViewActive } from '../hooks/useInViewActive';

interface HorizontalGalleryProps {
  /** Section heading block, rendered above the cards. */
  heading?: React.ReactNode;
  /** The card elements. Each is wrapped with a responsive gallery width. */
  children: React.ReactNode;
  /** Card count — accepted for API compatibility; unused by the simple rail. */
  count?: number;
  /** Desktop grid column classes, e.g. `md:grid-cols-2 lg:grid-cols-4`. */
  desktopGrid: string;
  /** Mobile layout: `'rail'` (horizontal swipe, default) or `'stack'`
   *  (full-width cards stacked vertically — for tall cards like tickets and
   *  instructor monitors that read better one-per-row on a phone). */
  mobileLayout?: 'rail' | 'stack';
}

/**
 * Responsive card gallery. Desktop (`md+`) is always the section's static grid
 * (`desktopGrid`). Mobile (`<md`) is one of:
 *
 * - **`rail`** (default): a native horizontal snap rail — swipe through cards
 *   one at a time. The card snapped to the centre gets `.is-active` (shared
 *   `useInViewActive`, horizontal band) so its `live:`/`group-live:` effects
 *   play. Generous vertical padding keeps the lift + shadow from being clipped
 *   by the scroll container (`overflow-x:auto` forces `overflow-y` to clip).
 * - **`stack`**: full-width cards stacked vertically — no scroll container, so
 *   tall cards are fully visible and shadows breathe. The vertically-centred
 *   card gets `.is-active` (vertical band).
 *
 * Both modes no-op the active-card emphasis on desktop and under reduced motion.
 */
export const HorizontalGallery: React.FC<HorizontalGalleryProps> = ({
  heading,
  children,
  desktopGrid,
  mobileLayout = 'rail',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isStack = mobileLayout === 'stack';

  // Light up the centred card (mobile only; no-ops at md+ / reduced motion).
  // Rail → horizontal band within the scroller; stack → vertical band in the
  // viewport. Cards keep `data-scene-card`.
  useInViewActive(rootRef, {
    selector: '[data-scene-card]',
    ioRoot: isStack ? undefined : rootRef,
    bandAxis: isStack ? 'vertical' : 'horizontal',
    bandInset: isStack ? 38 : 42,
  });

  const items = React.Children.map(children, (child) => (
    <div
      className={
        isStack
          ? 'w-full md:w-auto md:max-w-none'
          : 'w-[80vw] max-w-xs shrink-0 snap-center md:w-auto md:max-w-none'
      }
    >
      {child}
    </div>
  ));

  if (isStack) {
    // Vertical stack on mobile, grid on desktop. No scroll container → shadows
    // and tall cards are never clipped.
    return (
      <>
        {heading}
        <div ref={rootRef} className={`mt-8 flex flex-col gap-6 md:mt-0 md:grid ${desktopGrid} md:gap-6`}>
          {items}
        </div>
      </>
    );
  }

  return (
    <>
      {heading}
      {/* Native horizontal snap rail on mobile; grid on desktop. The vertical
          py (≈32px) is the room a scroll container needs so the active card's
          lift + elevated shadow aren't sliced flat at the top/bottom edges;
          the matching -my cancels it so vertical rhythm is unchanged. */}
      <div
        ref={rootRef}
        className={`-mx-4 -my-8 mt-2 flex gap-5 overflow-x-auto px-4 py-8 snap-x snap-mandatory scrollbar-hide
          md:mx-0 md:my-0 md:mt-0 md:grid ${desktopGrid} md:gap-6 md:overflow-visible md:px-0 md:py-0`}
      >
        {items}
      </div>
    </>
  );
};
HorizontalGallery.displayName = 'HorizontalGallery';
