import { Play, CheckCircle2, Users, Award } from 'lucide-react';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { useSiteSection } from '../context/SiteContentContext';

/** Verbatim current copy; used while the `about_page` CMS section is empty. */
const DEFAULT_ABOUT = {
  pill: 'Our Mission',
  heading: 'About Eyebuckz',
  body:
    'Eyebuckz is a filmmaker-built learning platform for creators who are serious about their craft. ' +
    'We bridge the gap between free YouTube tutorials and expensive film school — giving you ' +
    'structured, practical education with real industry workflows.',
};

export const About: React.FC = () => {
  const rows = useSiteSection('about_page');
  const copy = React.useMemo(() => {
    const item = rows?.[0];
    if (!item) { return DEFAULT_ABOUT; }
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
    return {
      pill: str(meta.pill, DEFAULT_ABOUT.pill),
      heading: str(item.title, DEFAULT_ABOUT.heading),
      body: str(item.body, DEFAULT_ABOUT.body),
    };
  }, [rows]);

  return (
    <>
    <Helmet>
      <title>About — Eyebuckz Academy</title>
      <meta name="description" content="Eyebuckz is a filmmaking academy dedicated to empowering the next generation of visual storytellers through industry-leading masterclasses." />
      <meta property="og:title" content="About — Eyebuckz Academy" />
      <meta property="og:description" content="Empowering the next generation of visual storytellers through industry-leading masterclasses." />
      <meta property="og:type" content="website" />
    </Helmet>
    <div className="min-h-[60vh] px-4 py-24 t-bg-alt">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-full font-bold tracking-wider uppercase text-xs mb-6">
            {copy.pill}
          </div>
          <h1 className="text-5xl font-black t-text mb-6 leading-tight">{copy.heading}</h1>
          {/* Blank lines in the CMS body become paragraphs. */}
          {copy.body.split(/\n{2,}/).map((para, i) => (
            <p key={i} className={`text-xl t-text-2 leading-relaxed${i > 0 ? ' mt-4' : ''}`}>
              {para}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="t-card t-border border rounded-2xl p-6 text-center shadow-sm">
            <CheckCircle2 size={32} className="text-brand-400 mx-auto mb-3" />
            <h3 className="font-bold t-text mb-2">Practical Learning</h3>
            <p className="text-sm t-text-2">Every course includes raw footage, project files, and real-world assignments — not just theory.</p>
          </div>
          <div className="t-card t-border border rounded-2xl p-6 text-center shadow-sm">
            <Users size={32} className="text-brand-400 mx-auto mb-3" />
            <h3 className="font-bold t-text mb-2">10,000+ Creators</h3>
            <p className="text-sm t-text-2">A growing community of filmmakers, colorists, and content creators from 50+ countries.</p>
          </div>
          <div className="t-card t-border border rounded-2xl p-6 text-center shadow-sm">
            <Award size={32} className="text-brand-400 mx-auto mb-3" />
            <h3 className="font-bold t-text mb-2">Certified Learning</h3>
            <p className="text-sm t-text-2">Earn a verified certificate upon completion. Add it to your portfolio or LinkedIn.</p>
          </div>
        </div>

        <div className="t-card t-border border rounded-2xl p-8 mb-12 shadow-sm">
          <h2 className="text-2xl font-bold t-text mb-4">What We Offer</h2>
          <ul className="space-y-3 t-text-2">
            <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-brand-400 mt-0.5 flex-shrink-0" /> Professional cinematography and color grading masterclasses</li>
            <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-brand-400 mt-0.5 flex-shrink-0" /> 100GB+ of 6K RAW footage from RED and Arri Alexa cameras</li>
            <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-brand-400 mt-0.5 flex-shrink-0" /> Business templates, client contracts, and monetization strategies</li>
            <li className="flex items-start gap-3"><CheckCircle2 size={18} className="text-brand-400 mt-0.5 flex-shrink-0" /> Lifetime access to all purchased courses</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-3 rounded-full transition"
          >
            Browse Courses
          </Link>
          <a
            href="https://youtube.com/@eyebuckz"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 t-card hover:bg-[var(--surface-hover)] t-border border t-text font-bold px-8 py-3 rounded-full transition"
          >
            <Play size={16} fill="currentColor" /> Watch on YouTube
          </a>
        </div>
      </div>
    </div>
    </>
  );
};
