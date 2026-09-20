import { ChevronRight } from 'lucide-react';
import React, { useEffect, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Labels published by pages for URL segments the trail cannot name on its own.
 *
 * The trail is derived purely from the pathname, so a dynamic segment like a
 * course slug rendered as "capitalise the segment" — the breadcrumb read
 * "Home > Course > C4-editing" while the page itself was titled "Part 1 - From
 * Zero to Influencer". Pages that load the real name call
 * `useBreadcrumbLabel(slug, title)` and the trail re-renders with it.
 */
const dynamicLabels = new Map<string, string>();
const listeners = new Set<() => void>();
let labelsVersion = 0;

const notify = () => { labelsVersion++; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/**
 * Publish a human label for a URL segment while the calling page is mounted.
 * Pass the raw segment exactly as it appears in the path (slug or id).
 * No-ops until `label` is truthy, so callers can pass the not-yet-loaded title.
 */
export function useBreadcrumbLabel(segment: string | undefined, label: string | undefined): void {
  useEffect(() => {
    if (!segment || !label) { return; }
    dynamicLabels.set(segment, label);
    notify();
    return () => {
      dynamicLabels.delete(segment);
      notify();
    };
  }, [segment, label]);
}

interface BreadcrumbItem {
  label: string;
  path: string;
  navigable: boolean;
}

const STATIC_LABELS: Record<string, string> = {
  '': 'Home',
  'about': 'About',
  'contact': 'Contact',
  'privacy': 'Privacy Policy',
  'terms': 'Terms of Service',
  'login': 'Login',
  'dashboard': 'My Studio',
  'profile': 'Profile',
  'success': 'Purchase Complete',
  'admin': 'Admin',
  'courses': 'Courses',
  'users': 'Users',
  'payments': 'Payments',
  'certificates': 'Certificates',
  'content': 'CMS Content',
  'coupons': 'Coupons',
  'reviews': 'Reviews',
  'audit': 'Audit Log',
  'settings': 'Settings',
  'course': 'Course',
  'learn': 'Continue Learning',
  'checkout': 'Checkout',
  'assets': 'Digital Assets',
  'asset': 'Asset',
};

/** Path segments that name a group but have no index route (e.g. /course/:id
 *  exists, /course does not). Their crumb is shown as plain text, never a link. */
const NON_NAVIGABLE = new Set(['course', 'asset', 'checkout', 'learn']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function segmentLabel(segment: string): string {
  // A page-published dynamic label (a course/asset title) or a known static
  // label wins — checked BEFORE the UUID guard so a course whose id is a UUID
  // still shows its real title. Every admin-created course has a UUID id
  // (gen_random_uuid), so checking the UUID pattern first dropped the title on
  // exactly the courses users actually create.
  const known = dynamicLabels.get(segment) || STATIC_LABELS[segment];
  if (known) return known;
  // Bare UUID with no published label: hide the segment entirely.
  if (UUID_RE.test(segment)) return '';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** Builds a breadcrumb trail from the current route. Renders nothing on the home page. */
export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  // Re-render when a page publishes/retracts a dynamic segment label.
  useSyncExternalStore(subscribe, () => labelsVersion);
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const items: BreadcrumbItem[] = [{ label: 'Home', path: '/', navigable: true }];

  let accumulated = '';
  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label = segmentLabel(seg);
    if (!label) continue; // skip UUID-only segments (dynamic IDs)
    items.push({ label, path: accumulated, navigable: !NON_NAVIGABLE.has(seg) });
  }

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <ol className="flex items-center gap-1.5 text-sm t-text-2 overflow-x-auto whitespace-nowrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="t-text-3 flex-shrink-0" />}
              {isLast ? (
                <span className="t-text font-medium truncate max-w-[200px]" aria-current="page">{item.label}</span>
              ) : item.navigable ? (
                <Link to={item.path} className="hover:text-brand-400 transition truncate max-w-[200px]">{item.label}</Link>
              ) : (
                <span className="t-text-2 truncate max-w-[200px]">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
