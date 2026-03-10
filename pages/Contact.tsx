import { Mail, Youtube } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

export const Contact: React.FC = () => {
  return (
    <div className="min-h-[60vh] px-4 py-24 t-bg">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 text-brand-400 rounded-full font-bold tracking-wider uppercase text-xs mb-6">
          Get in Touch
        </div>
        <h1 className="text-5xl font-black t-text mb-4">Contact Us</h1>
        <p className="text-lg t-text-2 leading-relaxed mb-12">
          Have a question about a course, payment, or your account? We're here to help.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <a
            href="mailto:support@eyebuckz.com"
            className="t-card t-border border rounded-2xl p-6 hover:border-brand-500/40 transition group text-left"
          >
            <Mail size={28} className="text-brand-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold t-text mb-1">Email Support</h3>
            <p className="text-sm t-text-2 mb-3">For course access, billing, or general questions.</p>
            <span className="text-brand-400 text-sm font-medium">support@eyebuckz.com</span>
          </a>
          <a
            href="https://youtube.com/@eyebuckz"
            target="_blank"
            rel="noreferrer"
            className="t-card t-border border rounded-2xl p-6 hover:border-[#FF0000]/40 transition group text-left"
          >
            <Youtube size={28} className="text-[#FF6B6B] mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold t-text mb-1">YouTube Channel</h3>
            <p className="text-sm t-text-2 mb-3">Free tutorials, previews, and community updates.</p>
            <span className="text-[#FF6B6B] text-sm font-medium">@eyebuckz</span>
          </a>
        </div>

        <div className="t-card t-border border rounded-2xl p-6 mb-10 text-left">
          <h3 className="font-bold t-text mb-3">Frequently Asked</h3>
          <ul className="space-y-2 text-sm t-text-2">
            <li><strong className="t-text">Access issues:</strong> Email us with your order ID and we'll restore access within 24 hours.</li>
            <li><strong className="t-text">Refunds:</strong> We offer refunds within 7 days of purchase if you haven't completed more than 20% of the course.</li>
            <li><strong className="t-text">Certificates:</strong> Certificates are auto-generated when you complete 100% of a course.</li>
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
  );
};
