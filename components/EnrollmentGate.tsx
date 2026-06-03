import { Lock, ArrowRight, CheckCircle2, Star, Users } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Props for the EnrollmentGate component.
 *
 * Rendered by the Learn page when `useAccessControl` returns `hasAccess: false`.
 * The gate is a full-screen paywall that navigates to the Checkout or CourseDetails page.
 */
interface EnrollmentGateProps {
  /** UUID of the course — used for the checkout and back-navigation URLs. */
  courseId: string;
  /** Course display name shown in the gate header. */
  courseTitle: string;
  /** Course price in paise (1 INR = 100 paise). Displayed as `₹{price/100}`. */
  coursePrice: number;
  /** URL of the course thumbnail displayed as the gate background image. */
  courseThumbnail: string;
  /** Short course description shown in the gate body. */
  courseDescription: string;
  /** Total number of modules — used for the "N lessons" copy. */
  totalModules: number;
}

export const EnrollmentGate: React.FC<EnrollmentGateProps> = ({
  courseId,
  courseTitle,
  coursePrice,
  courseThumbnail,
  courseDescription,
  totalModules
}) => {
  const navigate = useNavigate();

  const handleEnroll = () => {
    navigate(`/checkout/${courseId}`);
  };

  const handleGoBack = () => {
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="min-h-screen t-bg flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        <div className="t-card t-border border rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with Course Image */}
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img
              src={courseThumbnail}
              alt={courseTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

            {/* Lock Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-xl rounded-full p-8 border border-white/20">
                <Lock size={64} className="text-white" />
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">
                {courseTitle}
              </h1>
              <p className="text-white/90 text-sm font-medium">
                {totalModules} comprehensive lessons waiting for you
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500/10 text-brand-500 rounded-full font-bold text-sm mb-4">
                <Lock size={16} />
                Enrollment Required
              </div>
              <h2 className="t-h2 t-text mb-3">
                Unlock Full Access to This Course
              </h2>
              <p className="t-body-lg t-text-2 max-w-2xl mx-auto">
                {courseDescription}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="t-status-success rounded-2xl p-6 text-center border">
                <div className="bg-[color:var(--status-success-text)]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="t-h4 mb-2">Lifetime Access</h3>
                <p className="text-sm opacity-80">Learn at your own pace, forever</p>
              </div>

              <div className="t-status-info rounded-2xl p-6 text-center border">
                <div className="bg-[color:var(--status-info-text)]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star size={24} />
                </div>
                <h3 className="t-h4 mb-2">Premium Content</h3>
                <p className="text-sm opacity-80">Industry-expert instructors</p>
              </div>

              <div className="t-status-warning rounded-2xl p-6 text-center border">
                <div className="bg-[color:var(--status-warning-text)]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users size={24} />
                </div>
                <h3 className="t-h4 mb-2">Community Access</h3>
                <p className="text-sm opacity-80">Join thousands of students</p>
              </div>
            </div>

            {/* Pricing and CTA */}
            <div className="t-bg-alt t-border rounded-2xl p-8 border">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="t-caption mb-1">One-time payment</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black t-text">₹{(coursePrice / 100).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={handleEnroll}
                    className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[var(--shadow-brand)] hover:-translate-y-0.5 group"
                  >
                    Enroll Now
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={handleGoBack}
                    className="t-card t-border t-text px-8 py-4 rounded-xl font-bold text-lg border hover:bg-[color:var(--surface-hover)] transition-all"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 t-border border-t flex flex-wrap justify-center gap-6 text-sm t-text-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[color:var(--status-success-text)]" />
                  <span>30-Day Money Back</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[color:var(--status-success-text)]" />
                  <span>Instant Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[color:var(--status-success-text)]" />
                  <span>Certificate Included</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-sm t-text-2 mt-6">
          Questions? <a href="mailto:support@eyebuckz.com" className="text-brand-500 hover:underline">Contact support</a> or{' '}
          <a href="/" className="text-brand-500 hover:underline">browse other courses</a>
        </p>
      </div>
    </div>
  );
};
