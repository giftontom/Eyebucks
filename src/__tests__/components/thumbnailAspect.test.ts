import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

/**
 * Course and digital-asset artwork is authored as a single 16:9 master
 * (the shipped thumbnails are 1672x941). Every box that art renders into must
 * therefore also be 16:9 — otherwise `object-cover` silently crops it, which is
 * exactly what shipped: a 4:3 catalog card ate 25% of the height, square
 * bundled-course rows ate 44% of the width, and the `h-[40vh]` detail hero ate
 * 35% of the width on a phone.
 *
 * This guards the invariant at the source level so a fixed height or a
 * non-16:9 ratio cannot creep back into a thumbnail box unnoticed. It is
 * deliberately source-based rather than render-based: jsdom has no layout
 * engine, so a rendered assertion could not tell 4:3 from 16:9.
 */

const ROOT = join(__dirname, '..', '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** Files that render course/asset artwork, and the marker for each media box. */
const THUMBNAIL_SITES: Array<{ file: string; boxes: number }> = [
  { file: 'components/CourseCard.tsx', boxes: 1 },
  { file: 'components/CourseCardSkeleton.tsx', boxes: 1 },
  { file: 'components/AssetCard.tsx', boxes: 1 },
  { file: 'components/OwnedAssetsTab.tsx', boxes: 1 },
  { file: 'components/EnrollmentGate.tsx', boxes: 1 },
  { file: 'pages/AssetDetails.tsx', boxes: 1 },
  { file: 'pages/AssetCheckout.tsx', boxes: 1 },
  { file: 'pages/PurchaseSuccess.tsx', boxes: 1 },
  { file: 'pages/checkout/CheckoutSummary.tsx', boxes: 1 },
  { file: 'pages/course-details/CourseDetailsHero.tsx', boxes: 1 },
];

/** Ratios that are NOT 16:9 and must never wrap course/asset art. */
const WRONG_RATIO = /aspect-\[\s*(?!16\s*\/\s*9)[\d.]+\s*\/\s*[\d.]+\s*\]/;

describe('thumbnail aspect ratio', () => {
  it.each(THUMBNAIL_SITES)('$file uses a 16:9 media box', ({ file, boxes }) => {
    const src = read(file);
    const matches = src.match(/aspect-video/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(boxes);
  });

  it.each(THUMBNAIL_SITES)('$file has no non-16:9 aspect box', ({ file }) => {
    expect(read(file)).not.toMatch(WRONG_RATIO);
  });

  it('the catalog card is 16:9 and its skeleton matches (no layout shift)', () => {
    // The skeleton must mirror the real card or the catalog jumps on load.
    expect(read('components/CourseCard.tsx')).toContain('aspect-video');
    expect(read('components/CourseCardSkeleton.tsx')).toContain('aspect-video');
  });

  it('the course detail hero is 16:9 below the cinematic lg breakpoint', () => {
    const src = read('pages/course-details/CourseDetailsHero.tsx');
    expect(src).toContain('aspect-video');
    // The tall letterbox is allowed, but only from lg up — at md it cropped
    // ~30% of the width on a 768px tablet.
    expect(src).not.toMatch(/md:h-\[\d+vh\]/);
    expect(src).toMatch(/lg:h-\[60vh\]/);
  });

  it('list-row thumbnails are not square', () => {
    // Square rows cropped 44% of the width off a 16:9 frame. Only media
    // wrappers count — `overflow-hidden` clips a child image; a `rounded-full`
    // status badge is legitimately square.
    for (const file of ['pages/CourseDetails.tsx', 'pages/Learn.tsx']) {
      const offenders = read(file)
        .split('\n')
        .filter(l => l.includes('overflow-hidden') && !l.includes('rounded-full'))
        .filter(l => /\bw-(\d+)\s+h-\1\b/.test(l));
      expect(offenders).toEqual([]);
    }
  });

  it('course art is never boxed by a bare fixed height', () => {
    // `w-full h-40 object-cover` on a full-bleed card cropped 21% of the width.
    for (const file of ['pages/Dashboard.tsx', 'components/OwnedAssetsTab.tsx']) {
      expect(read(file)).not.toMatch(/w-full\s+h-\d+\s+object-cover/);
    }
  });
});
