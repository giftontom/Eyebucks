import React from 'react';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="text-brand-600 hover:text-brand-700 text-sm font-medium mb-8 inline-block">&larr; Back to Home</Link>

      <h1 className="text-4xl font-bold t-text mb-8">Terms of Service</h1>
      <p className="t-text-3 mb-8">Last updated: March 14, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 t-text-2 leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using the Eyebuckz Academy platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">2. Account Registration</h2>
          <p>You must create an account using Google OAuth to access our courses. You are responsible for maintaining the security of your account and for all activities that occur under it. You must provide accurate information during registration.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">3. Course Access & Licensing</h2>
          <p>Upon successful payment, you are granted a non-transferable, non-exclusive license to access and view the purchased course content for personal, non-commercial use. Course materials remain the intellectual property of Eyebuckz Academy. You may not redistribute, resell, or share your access with others.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">4. Payment & Pricing</h2>
          <p>All payments are processed securely through Razorpay. Prices are displayed in Indian Rupees (INR). Each purchase grants lifetime access to the purchased course.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">4a. Refund Policy</h2>
          <p className="mb-3">We want you to be fully satisfied with your purchase. Our refund policy is as follows:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Eligibility window:</strong> Refund requests must be submitted within <strong>7 days</strong> of purchase.</li>
            <li><strong>Completion limit:</strong> Refunds are only available if you have completed <strong>20% or less</strong> of the course content. Once more than 20% of modules are completed, the course is considered accessed and no refund will be issued.</li>
            <li><strong>How to request:</strong> Contact our support team at <a href="mailto:support@eyebuckz.com" className="text-brand-600 hover:underline">support@eyebuckz.com</a> with your order ID and reason for the refund.</li>
            <li><strong>Processing time:</strong> Approved refunds are processed within 2–3 business days and may take an additional 5–7 business days to reflect in your account, depending on your bank.</li>
            <li><strong>Access revocation:</strong> Upon approval of a refund, your access to the course will be revoked and any certificate of completion will be invalidated.</li>
            <li><strong>Non-refundable situations:</strong> Refunds will not be issued after 7 days of purchase, if more than 20% of the course has been completed, or for duplicate purchases where the second enrollment was made in error (contact us immediately for duplicate cases).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">5. User Conduct</h2>
          <p>You agree not to: share your account credentials, attempt to access other users' data, reverse-engineer the platform, use automated tools to scrape content, or post harmful or misleading reviews. Violation of these terms may result in account suspension.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">6. Certificates</h2>
          <p>Certificates of completion are issued upon finishing all required course modules. Certificates are for personal use and represent course completion only. Eyebuckz Academy does not guarantee employment or certification equivalence.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">7. Intellectual Property</h2>
          <p>All course content, including videos, text, images, and supplementary materials, is protected by copyright. Unauthorized reproduction, distribution, or modification of any content is strictly prohibited.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">8. Limitation of Liability</h2>
          <p>Eyebuckz Academy is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you paid for the specific course in question.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">9. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms. We will notify users of significant changes via email.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold t-text mt-8 mb-4">10. Contact</h2>
          <p>For questions about these terms, please contact us at <a href="mailto:support@eyebuckz.com" className="text-brand-600 hover:underline">support@eyebuckz.com</a>.</p>
        </section>
      </div>
    </div>
  );
};
