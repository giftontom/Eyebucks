import { Mail, Youtube } from 'lucide-react';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { useSiteSection } from '../context/SiteContentContext';

/** Verbatim current copy; used while the `contact_copy` CMS section is empty. */
const DEFAULT_CONTACT = {
  eyebrow: 'Get in Touch',
  heading: 'Contact Us',
  subheading: "Have a question about a course, payment, or your account? We're here to help.",
  email: 'support@eyebuckz.com',
  emailNote: 'For course access, billing, or general questions.',
  youtubeUrl: 'https://youtube.com/@eyebuckz',
  youtubeNote: 'Free tutorials, previews, and community updates.',
  faqItems: [
    "Access issues: Email us with your order ID and we'll restore access within 24 hours.",
    "Refunds: We offer refunds within 7 days of purchase if you haven't completed more than 20% of the course.",
    'Certificates: Certificates are auto-generated when you complete 100% of a course.',
  ],
};

export const Contact: React.FC = () => {
  const rows = useSiteSection('contact_copy');
  const copy = React.useMemo(() => {
    const item = rows?.[0];
    if (!item) { return DEFAULT_CONTACT; }
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
    const items = Array.isArray(meta.faqItems)
      ? (meta.faqItems as unknown[]).map(String).map((s) => s.trim()).filter(Boolean)
      : [];
    return {
      eyebrow: str(meta.eyebrow, DEFAULT_CONTACT.eyebrow),
      heading: str(item.title, DEFAULT_CONTACT.heading),
      subheading: str(item.body, DEFAULT_CONTACT.subheading),
      email: str(meta.email, DEFAULT_CONTACT.email),
      emailNote: str(meta.emailNote, DEFAULT_CONTACT.emailNote),
      youtubeUrl: str(meta.youtubeUrl, DEFAULT_CONTACT.youtubeUrl),
      youtubeNote: str(meta.youtubeNote, DEFAULT_CONTACT.youtubeNote),
      faqItems: items.length > 0 ? items : DEFAULT_CONTACT.faqItems,
    };
  }, [rows]);

  // "@handle" shown on the YouTube card, derived from the URL's last path segment.
  const youtubeHandle = React.useMemo(() => {
    const m = copy.youtubeUrl.match(/@[\w.-]+/);
    return m ? m[0] : 'YouTube';
  }, [copy.youtubeUrl]);

  return (
    <>
    <Helmet>
      <title>Contact — Eyebuckz Academy</title>
      <meta name="description" content="Get in touch with the Eyebuckz team. We'd love to hear from you about courses, collaborations, or general inquiries." />
      <meta property="og:title" content="Contact — Eyebuckz Academy" />
      <meta property="og:description" content="Get in touch with the Eyebuckz team." />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="min-h-[60vh] px-4 py-24 t-bg-alt">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-full font-bold tracking-wider uppercase text-xs mb-6">
          {copy.eyebrow}
        </div>
        <h1 className="text-5xl font-black t-text mb-4">{copy.heading}</h1>
        <p className="text-lg t-text-2 leading-relaxed mb-12">
          {copy.subheading}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <a
            href={`mailto:${copy.email}`}
            className="t-card t-border border rounded-2xl p-6 hover:border-brand-500/40 transition group text-left shadow-sm"
          >
            <Mail size={28} className="text-brand-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold t-text mb-1">Email Support</h3>
            <p className="text-sm t-text-2 mb-3">{copy.emailNote}</p>
            <span className="text-brand-400 text-sm font-medium">{copy.email}</span>
          </a>
          <a
            href={copy.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="t-card t-border border rounded-2xl p-6 hover:border-[#FF0000]/40 transition group text-left"
          >
            <Youtube size={28} className="text-[var(--link)] mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold t-text mb-1">YouTube Channel</h3>
            <p className="text-sm t-text-2 mb-3">{copy.youtubeNote}</p>
            <span className="text-[var(--link)] text-sm font-medium">{youtubeHandle}</span>
          </a>
        </div>

        <div className="t-card t-border border rounded-2xl p-6 mb-10 text-left shadow-sm">
          <h3 className="font-bold t-text mb-3">Frequently Asked</h3>
          <ul className="space-y-2 text-sm t-text-2">
            {copy.faqItems.map((item, i) => {
              // Bold the label before the first colon, if any.
              const idx = item.indexOf(':');
              const label = idx > 0 ? item.slice(0, idx) : '';
              const rest = idx > 0 ? item.slice(idx + 1).trim() : item;
              return (
                <li key={i}>
                  {label && <strong className="t-text">{label}:</strong>} {rest}
                </li>
              );
            })}
          </ul>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 t-card hover:bg-[var(--surface-hover)] t-border border t-text font-bold px-8 py-3 rounded-full transition"
        >
          Back to Courses
        </Link>
      </div>
    </div>
    </>
  );
};
