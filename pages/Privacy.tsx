import React from 'react';
import { Link } from 'react-router-dom';

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="text-brand-600 hover:text-brand-700 text-sm font-medium mb-8 inline-block">&larr; Back to Home</Link>

      <h1 className="text-4xl font-bold text-neutral-900 mb-8">Privacy Policy</h1>
      <p className="text-neutral-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-neutral max-w-none space-y-6 text-neutral-700 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">1. Information We Collect</h2>
          <p>We collect information you provide when creating an account, including your name, email address, and Google profile information through OAuth authentication. We also collect payment information processed securely through Razorpay.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our services, process payments, send course-related communications, and issue certificates of completion. We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">3. Data Storage & Security</h2>
          <p>Your data is stored securely using Supabase infrastructure with row-level security policies. All data transmission is encrypted using TLS. Payment data is handled exclusively by Razorpay and is never stored on our servers.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">4. Cookies & Tracking</h2>
          <p>We use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising pixels.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">5. Third-Party Services</h2>
          <p>We use the following third-party services: Google OAuth for authentication, Razorpay for payment processing, Bunny.net for video streaming, and Resend for transactional emails. Each service has its own privacy policy.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">6. Your Rights</h2>
          <p>You have the right to access, update, or delete your personal data. You can update your profile information from your account settings. To request account deletion, please contact us at the email below.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">7. Contact</h2>
          <p>For privacy-related inquiries, please contact us at <a href="mailto:privacy@eyebuckz.com" className="text-brand-600 hover:underline">privacy@eyebuckz.com</a>.</p>
        </section>
      </div>
    </div>
  );
};
