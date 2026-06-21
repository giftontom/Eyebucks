import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path: string;
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
};

function segmentLabel(segment: string): string {
  // UUID pattern: show as generic label
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)) return '';
  return STATIC_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** Builds a breadcrumb trail from the current route. Renders nothing on the home page. */
export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const items: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];

  let accumulated = '';
  for (const seg of segments) {
    accumulated += `/${seg}`;
    const label = segmentLabel(seg);
    if (!label) continue; // skip UUID-only segments (dynamic IDs)
    items.push({ label, path: accumulated });
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
              ) : (
                <Link to={item.path} className="hover:text-brand-400 transition truncate max-w-[200px]">{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
