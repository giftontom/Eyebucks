import React from 'react';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="text-brand-600 hover:text-brand-700 text-sm font-medium mb-8 inline-block">&larr; Back to Home</Link>

      <h1 className="text-4xl font-bold text-neutral-900 mb-8">Terms of Service</h1>
      <p className="text-neutral-500 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-neutral max-w-none space-y-6 text-neutral-700 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using the Eyebuckz Academy platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">2. Account Registration</h2>
          <p>You must create an account using Google OAuth to access our courses. You are responsible for maintaining the security of your account and for all activities that occur under it. You must provide accurate information during registration.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">3. Course Access & Licensing</h2>
          <p>Upon successful payment, you are granted a non-transferable, non-exclusive license to access and view the purchased course content for personal, non-commercial use. Course materials remain the intellectual property of Eyebuckz Academy. You may not redistribute, resell, or share your access with others.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">4. Payment & Refunds</h2>
          <p>All payments are processed securely through Razorpay. Prices are displayed in Indian Rupees (INR). Each purchase grants lifetime access to the course. Refund requests may be considered on a case-by-case basis within 30 days of purchase by contacting our support team.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">5. User Conduct</h2>
          <p>You agree not to: share your account credentials, attempt to access other users' data, reverse-engineer the platform, use automated tools to scrape content, or post harmful or misleading reviews. Violation of these terms may result in account suspension.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">6. Certificates</h2>
          <p>Certificates of completion are issued upon finishing all required course modules. Certificates are for personal use and represent course completion only. Eyebuckz Academy does not guarantee employment or certification equivalence.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">7. Intellectual Property</h2>
          <p>All course content, including videos, text, images, and supplementary materials, is protected by copyright. Unauthorized reproduction, distribution, or modification of any content is strictly prohibited.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">8. Limitation of Liability</h2>
          <p>Eyebuckz Academy is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you paid for the specific course in question.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">9. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mt-8 mb-4">10. Contact</h2>
          <p>For questions about these terms, please contact us at <a href="mailto:support@eyebuckz.com" className="text-brand-600 hover:underline">support@eyebuckz.com</a>.</p>
        </section>
      </div>
    </div>
  );
};
