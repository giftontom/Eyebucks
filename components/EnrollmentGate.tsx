import { Lock, ArrowRight, CheckCircle2, Star, Users } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface EnrollmentGateProps {
  courseId: string;
  courseTitle: string;
  coursePrice: number;
  courseThumbnail: string;
  courseDescription: string;
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
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
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full font-bold text-sm mb-4">
                <Lock size={16} />
                Enrollment Required
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
                Unlock Full Access to This Course
              </h2>
              <p className="text-neutral-600 text-lg max-w-2xl mx-auto">
                {courseDescription}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-100">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={24} className="text-green-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-2">Lifetime Access</h3>
                <p className="text-sm text-neutral-600">Learn at your own pace, forever</p>
              </div>

              <div className="bg-blue-50 rounded-2xl p-6 text-center border border-blue-100">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star size={24} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-2">Premium Content</h3>
                <p className="text-sm text-neutral-600">Industry-expert instructors</p>
              </div>

              <div className="bg-purple-50 rounded-2xl p-6 text-center border border-purple-100">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users size={24} className="text-purple-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-2">Community Access</h3>
                <p className="text-sm text-neutral-600">Join thousands of students</p>
              </div>
            </div>

            {/* Pricing and CTA */}
            <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-200">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-neutral-500 mb-1">One-time payment</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-neutral-900">₹{(coursePrice / 100).toLocaleString()}</span>
                    <span className="text-lg text-neutral-400 line-through">₹{Math.round(coursePrice * 1.5 / 100).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-green-600 font-medium mt-1">
                    Save ₹{Math.round((coursePrice * 0.5) / 100).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={handleEnroll}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
                  >
                    Enroll Now
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={handleGoBack}
                    className="bg-white hover:bg-neutral-100 text-neutral-900 px-8 py-4 rounded-xl font-bold text-lg border border-neutral-200 transition-all"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-neutral-200 flex flex-wrap justify-center gap-6 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span>30-Day Money Back</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span>Instant Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span>Certificate Included</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-sm text-neutral-500 mt-6">
          Questions? <a href="mailto:support@eyebuckz.com" className="text-brand-600 hover:underline">Contact support</a> or{' '}
          <a href="/" className="text-brand-600 hover:underline">browse other courses</a>
        </p>
      </div>
    </div>
  );
};
