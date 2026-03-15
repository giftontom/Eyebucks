import { CheckCircle2, Play, LayoutGrid, Download, Share2, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { coursesApi, paymentsApi } from '../services/api';
import { analytics } from '../utils/analytics';
import { logger } from '../utils/logger';

import type { Payment } from '../services/api/payments.api';
import type { Course } from '../types';

export const PurchaseSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const orderId = searchParams.get('orderId');
  const bundleWarning = searchParams.get('bundleWarning');
  const [showConfetti, setShowConfetti] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentError, setPaymentError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!courseId) { setIsLoading(false); return; }
    coursesApi.getCourse(courseId)
      .then(res => {
        setCourse(res.course);
        analytics.track('purchase_success_viewed', {
          course_id: res.course.id,
          course_title: res.course.title,
          order_id: orderId,
        });
      })
      .catch((err) => logger.error('[PurchaseSuccess] Failed to load course:', err))
      .finally(() => setIsLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!orderId) {return;}
    paymentsApi.getPaymentByOrder(orderId)
      .then(p => { if (p) {setPayment(p);} })
      .catch((err) => { logger.error('[PurchaseSuccess] Failed to load payment:', err); setPaymentError(true); });
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center t-bg">
        <Loader2 className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center t-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold t-text mb-4">Course not found</h2>
          <Link to="/" className="text-brand-400 hover:text-brand-300 font-medium">Return to homepage</Link>
        </div>
      </div>
    );
  }

  const handleStartLearning = () => {
    navigate(`/learn/${course.id}`);
  };

  const handleDownloadReceipt = () => {
    // Escape user-controlled values before injecting into innerHTML to prevent XSS
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const receiptHtml = `
      <!DOCTYPE html>
      <html><head><title>Receipt - ${esc(payment?.receiptNumber || 'Eyebuckz')}</title>
      <style>body{font-family:system-ui;max-width:600px;margin:40px auto;padding:20px}h1{color:#1a1a1a}table{width:100%;border-collapse:collapse;margin:20px 0}td{padding:8px 0;border-bottom:1px solid #eee}.total{font-size:1.2em;font-weight:bold}.brand{color:#dc2626}</style>
      </head><body>
      <h1>Payment Receipt</h1>
      <p class="brand"><strong>Eyebuckz Academy</strong></p>
      <hr/>
      <table>
        <tr><td><strong>Receipt #</strong></td><td>${esc(payment?.receiptNumber || '—')}</td></tr>
        <tr><td><strong>Date</strong></td><td>${payment ? new Date(payment.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
        <tr><td><strong>Student</strong></td><td>${esc(user?.name || '—')}</td></tr>
        <tr><td><strong>Email</strong></td><td>${esc(user?.email || '—')}</td></tr>
        <tr><td><strong>Course</strong></td><td>${esc(course?.title || payment?.courseTitle || '—')}</td></tr>
        <tr><td><strong>Payment ID</strong></td><td style="font-size:0.85em">${esc(payment?.razorpayPaymentId || '—')}</td></tr>
        <tr><td><strong>Order ID</strong></td><td style="font-size:0.85em">${esc(payment?.razorpayOrderId || orderId || '—')}</td></tr>
        <tr><td class="total"><strong>Amount Paid</strong></td><td class="total">₹${payment ? (payment.amount / 100).toLocaleString('en-IN') : course ? (course.price / 100).toLocaleString('en-IN') : '—'}</td></tr>
      </table>
      <p style="color:#666;font-size:0.85em;margin-top:30px">Thank you for your purchase. This receipt is for your records.</p>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
      win.print();
    }
  };

  const handleShareSuccess = async () => {
    const shareData = {
      title: 'I just enrolled in ' + course.title,
      text: `Just started learning ${course.title} on Eyebuckz LMS!`,
      url: window.location.origin + `/course/${course.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        logger.debug('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(shareData.url).then(() => {
        showToast('Link copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Failed to copy link', 'error');
      });
    }
  };

  return (
    <div className="min-h-screen t-bg relative overflow-hidden">
      <ToastContainer />
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 animate-confetti">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  backgroundColor: ['#dc2626', '#2563eb', '#16a34a', '#eab308'][Math.floor(Math.random() * 4)],
                  animation: `fall ${2 + Math.random() * 3}s linear forwards`,
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Success Icon */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/10 rounded-full mb-6 animate-scale-in">
            <CheckCircle2 size={56} className="text-green-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black t-text mb-4">
            Welcome to the Course!
          </h1>
          <p className="text-xl t-text-2 max-w-2xl mx-auto">
            Your enrollment is confirmed. You now have <span className="font-bold text-green-400">lifetime access</span> to all course materials.
          </p>
        </div>

        {/* Bundle warning card */}
        {bundleWarning && (
          <div className="mb-8 p-5 t-status-warning border rounded-2xl animate-fade-in-up">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Partial Enrollment Issue</p>
                <p className="text-sm mb-3">{bundleWarning}</p>
                <a
                  href="mailto:support@eyebuckz.com?subject=Bundle Enrollment Issue"
                  className="text-sm font-bold underline hover:no-underline"
                >
                  Contact Support →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Course Card */}
        <div className="t-card t-border border rounded-3xl shadow-2xl overflow-hidden mb-8 animate-fade-in-up">
          <div className="grid md:grid-cols-5 gap-6">
            {/* Course Image */}
            <div className="md:col-span-2 relative aspect-[4/3] md:aspect-auto">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase mb-2">
                  {course.type}
                </span>
              </div>
            </div>

            {/* Course Details */}
            <div className="md:col-span-3 p-8">
              <h2 className="text-2xl font-bold t-text mb-4">{course.title}</h2>
              <p className="t-text-2 mb-6 line-clamp-2">{course.description}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm t-text-2">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span>{(course.chapters?.length || 0)} comprehensive lessons</span>
                </div>
                <div className="flex items-center gap-3 text-sm t-text-2">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span>Lifetime access to all materials</span>
                </div>
                <div className="flex items-center gap-3 text-sm t-text-2">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center gap-3 text-sm t-text-2">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span>Auto-save progress across devices</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleStartLearning}
                  className="flex-1 sm:flex-none bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 group"
                >
                  <Play size={20} fill="currentColor" />
                  Start Learning Now
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <Link
                  to="/dashboard"
                  className="flex-1 sm:flex-none t-card hover:bg-[var(--surface-hover)] t-border border t-text px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
                >
                  <LayoutGrid size={20} />
                  My Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up">
          <div
            onClick={handleDownloadReceipt}
            className="t-card t-border border rounded-2xl p-6 hover:bg-[var(--surface-hover)] transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              <div className="bg-blue-500/10 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                <Download size={24} style={{ color: 'var(--status-info-text)' }} />
              </div>
              <div>
                <h3 className="font-bold t-text mb-1">Receipt & Invoice</h3>
                {paymentError ? (
                  <p className="text-sm t-text-2 mb-3" style={{ color: 'var(--status-danger-text)' }}>Could not load receipt details</p>
                ) : (
                  <p className="text-sm t-text-2 mb-3">Download your purchase confirmation for records</p>
                )}
                <span className="text-sm text-brand-400 font-medium flex items-center gap-1">
                  Download Receipt <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </div>

          <div
            onClick={handleShareSuccess}
            className="t-card t-border border rounded-2xl p-6 hover:bg-[var(--surface-hover)] transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              <div className="bg-purple-500/10 p-3 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                <Share2 size={24} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold t-text mb-1">Share Your Achievement</h3>
                <p className="text-sm t-text-2 mb-3">Let others know you're learning something new!</p>
                <span className="text-sm text-brand-400 font-medium flex items-center gap-1">
                  Share on Social <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-12 bg-brand-600 rounded-2xl p-8 text-white text-center animate-fade-in-up">
          <h3 className="text-2xl font-bold mb-4">What's Next?</h3>
          <p className="text-brand-100 mb-6 max-w-2xl mx-auto">
            Start with the first lesson, take notes, and practice what you learn. Your progress will be automatically saved so you can pick up where you left off anytime.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-brand-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>30-Day Money Back Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Lifetime Access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Mobile & Desktop</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes scale-in {
          0% { transform: scale(0) rotate(-180deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  );
};
