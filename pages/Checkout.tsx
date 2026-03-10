import { ShieldCheck, Loader2, CheckCircle2, Layers, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { Button, Input } from '../components';
import { useAuth } from '../context/AuthContext';
import { useScript } from '../hooks/useScript';
import { coursesApi, enrollmentsApi, checkoutApi, couponsApi } from '../services/api';
import { supabase } from '../services/supabase';
import { CourseType } from '../types';
import { logger } from '../utils/logger';

import type { Course } from '../types';

// Razorpay SDK types
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => Promise<void>;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const BundleIncludedCourses: React.FC<{ courses: NonNullable<Course['bundledCourses']> }> = ({ courses }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-4 t-card t-border border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition text-sm"
        aria-expanded={expanded}
        aria-label="Toggle bundled courses list"
      >
        <span className="flex items-center gap-2 font-medium t-text">
          <Layers size={14} className="text-brand-400" />
          Includes {courses.length} course{courses.length !== 1 ? 's' : ''}
        </span>
        {expanded ? <ChevronUp size={16} className="t-text-3" /> : <ChevronDown size={16} className="t-text-3" />}
      </button>
      {expanded && (
        <div className="border-t t-border px-3 py-2 space-y-2">
          {courses.map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-sm t-text-2">
              <BookOpen size={12} className="text-brand-400 flex-shrink-0" />
              <span className="truncate">{c.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Checkout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();

  // Load Razorpay script
  const razorpayLoaded = useScript('https://checkout.razorpay.com/v1/checkout.js');

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [isCheckingOwnership, setIsCheckingOwnership] = useState(true);

  // Fetch course from API
  useEffect(() => {
    if (!id) {
      setIsLoadingCourse(false);
      return;
    }
    coursesApi.getCourse(id)
      .then(res => setCourse(res.course))
      .catch(err => logger.error('[Checkout] Failed to load course:', err))
      .finally(() => setIsLoadingCourse(false));
  }, [id]);
  const [status, setStatus] = useState<'IDLE' | 'CREATING_ORDER' | 'PAYING' | 'VERIFYING' | 'SUCCESS'>('IDLE');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone_e164 || ''
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponUseId, setCouponUseId] = useState<string | undefined>(undefined);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  // Check if user already owns this course
  useEffect(() => {
    const checkOwnership = async () => {
      if (user && id) {
        try {
          const hasAccess = await enrollmentsApi.checkAccess(id);
          setAlreadyOwned(hasAccess);
        } catch (error) {
          logger.error('Error checking ownership:', error);
        }
      }
      setIsCheckingOwnership(false);
    };

    checkOwnership();
  }, [user, id]);

  // Update form data when user logs in
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone_e164 || ''
      });
    }
  }, [user]);

  if (isLoadingCourse) {
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
          <Link to="/" className="text-brand-400 hover:text-brand-300 font-bold">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Loading ownership check
  if (isCheckingOwnership) {
    return (
      <div className="min-h-screen flex items-center justify-center t-bg">
        <Loader2 className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  // If already owned, show message
  if (alreadyOwned) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 t-bg">
        <div className="max-w-md w-full text-center t-card p-8 rounded-xl t-border border">
          <div className="w-16 h-16 t-status-success border rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-4 t-text">You already own this course!</h2>
          <p className="t-text-2 mb-6">
            You have full access to all course materials.
          </p>
          <Link
            to={`/learn/${id}`}
            className="block w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg transition mb-3"
          >
            Go to Course
          </Link>
          <Link
            to="/dashboard"
            className="block w-full t-card hover:bg-[var(--surface-hover)] t-text font-medium py-3 rounded-lg transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !course) { return; }
    setCouponLoading(true);
    setCouponError('');
    try {
      const result = await couponsApi.applyCoupon(couponInput, course.id);
      setCouponDiscount(result.discountPct);
      setCouponUseId(result.couponUseId);
      setCouponApplied(true);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon');
      setCouponDiscount(0);
      setCouponUseId(undefined);
      setCouponApplied(false);
    } finally {
      setCouponLoading(false);
    }
  };

  const discountedPrice = course ? Math.round(course.price * (1 - couponDiscount / 100)) : 0;

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim() || !/^\+[1-9]\d{6,14}$/.test(formData.phone)) {
      errors.phone = 'Enter a valid phone number (e.g., +919876543210)';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setWarningMessage('');

    if (!user) {
      await login();
      return;
    }

    if (!validateForm()) {return;}

    try {
      // Refresh session before calling Edge Function to avoid "Invalid JWT" on expired tokens
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        setErrorMessage('Your session expired. Please log in again.');
        await login();
        return;
      }

      // Step 1: Create Order
      setStatus('CREATING_ORDER');

      const orderResponse = await checkoutApi.createOrder(course.id, couponUseId);

      logger.debug('[Checkout] Order created:', orderResponse);

      // Show warning if using mock data due to database issues
      if (orderResponse.warning) {
        setWarningMessage(orderResponse.warning);
      }

      // Check if Razorpay is available and not in mock mode
      if (!orderResponse.mock && razorpayLoaded && window.Razorpay) {
        // Step 2: Launch Razorpay Checkout
        setStatus('PAYING');

        const options = {
          key: orderResponse.key,
          amount: orderResponse.amount,
          currency: orderResponse.currency,
          name: 'Eyebuckz',
          description: orderResponse.courseTitle,
          order_id: orderResponse.orderId,
          handler: async (response: RazorpayResponse) => {
            // Step 3: Verify Payment
            await handlePaymentSuccess(response, orderResponse.orderId);
          },
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: '#ef4444'
          },
          modal: {
            ondismiss: () => {
              setStatus('IDLE');
              setErrorMessage('Payment cancelled');
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        // Mock mode - simulate payment
        logger.debug('[Checkout] Using mock payment mode');
        setStatus('PAYING');

        // Simulate payment delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify mock payment
        await handlePaymentSuccess(
          {
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_order_id: orderResponse.orderId,
            razorpay_signature: 'mock_signature'
          },
          orderResponse.orderId
        );
      }
    } catch (error: any) {
      logger.error('[Checkout] Error:', error);
      setStatus('IDLE');
      setErrorMessage(error.message || 'Payment failed. Please try again.');
    }
  };

  const handlePaymentSuccess = async (response: RazorpayResponse, orderId: string) => {
    try {
      setStatus('VERIFYING');

      const verifyResponse = await checkoutApi.verifyPayment({
        orderId: orderId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
        courseId: course.id,
      });

      if (verifyResponse.verified) {
        logger.info('[Checkout] Payment verified, enrollment created:', verifyResponse.enrollmentId);

        setStatus('SUCCESS');

        // Redirect to success page after brief delay
        setTimeout(() => {
          const params = new URLSearchParams({ courseId: course.id, orderId });
          if (verifyResponse.bundleWarning && verifyResponse.failedCourseIds?.length) {
            params.set('bundleWarning', `${verifyResponse.bundleWarning}. Failed course IDs: ${verifyResponse.failedCourseIds.join(', ')}`);
          }
          navigate(`/success?${params.toString()}`);
        }, 1500);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      logger.error('[Checkout] Verification error:', error);
      setStatus('IDLE');
      setErrorMessage('Payment verification failed. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen t-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 rounded-3xl overflow-hidden t-border border">

        {/* Left: Order Summary */}
        <div className="p-8 t-card flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-6 t-text">Order Summary</h2>
            <div className="flex gap-4 mb-6">
              <img src={course.thumbnail} className="w-24 h-16 object-cover rounded-lg t-border border" alt="Course" />
              <div>
                <h3 className="font-bold t-text leading-tight">{course.title}</h3>
                <p className="text-sm t-text-2 mt-1">{course.type === CourseType.BUNDLE ? `Bundle • ${course.bundledCourses?.length || 0} Courses` : course.type}</p>
              </div>
            </div>
            {course.type === CourseType.BUNDLE && course.bundledCourses && course.bundledCourses.length > 0 && (
              <BundleIncludedCourses courses={course.bundledCourses} />
            )}
            {/* Coupon Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponApplied(false); setCouponDiscount(0); setCouponError(''); }}
                  placeholder="Coupon code"
                  disabled={couponApplied}
                  error={couponError}
                  containerClassName="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  loading={couponLoading}
                  disabled={!couponInput.trim() || couponApplied}
                  onClick={handleApplyCoupon}
                >
                  {couponApplied ? '✓' : 'Apply'}
                </Button>
              </div>
              {couponApplied && <p className="text-xs mt-1" style={{ color: 'var(--status-success-text)' }}>{couponDiscount}% discount applied!</p>}
            </div>

            <div className="border-t t-border pt-4 space-y-2">
              {couponDiscount > 0 && (
                <>
                  <div className="flex justify-between t-text-2 text-sm">
                    <span>Subtotal</span>
                    <span>₹{(course.price / 100).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm" style={{ color: 'var(--status-success-text)' }}>
                    <span>Discount ({couponDiscount}%)</span>
                    <span>-₹{((course.price - discountedPrice) / 100).toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xl font-bold t-text pt-2">
                <span>Total Due</span>
                <span>₹{(discountedPrice / 100).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 t-text-2 text-sm mt-8 t-card p-3 rounded-lg t-border border">
            <ShieldCheck size={16} style={{ color: 'var(--status-success-text)' }} />
            <span>SSL Secure Payment • 256-bit Encryption</span>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div className="p-8 relative t-bg">
          {status === 'SUCCESS' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 animate-fade-in">
              <CheckCircle2 size={64} className="mb-4" style={{ color: 'var(--status-success-text)' }} />
              <h3 className="text-2xl font-bold text-white">Payment Successful!</h3>
              <p className="text-white/70 mt-2">Redirecting to your studio...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-6 t-text">Secure Checkout</h2>

              {errorMessage && (
                <div className="mb-4 p-3 t-status-danger border rounded-lg text-sm flex items-center justify-between gap-3">
                  <span>{errorMessage}</span>
                  <button
                    onClick={() => { setErrorMessage(''); setStatus('IDLE'); }}
                    className="text-xs font-bold underline shrink-0 opacity-80 hover:opacity-100"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {warningMessage && (
                <div className="mb-4 p-3 t-status-warning border rounded-lg text-sm">
                  <strong>⚠️ Development Mode:</strong> {warningMessage}
                </div>
              )}

              {!razorpayLoaded && !warningMessage && (
                <div className="mb-4 p-3 t-status-warning border rounded-lg text-sm">
                  Loading payment gateway...
                </div>
              )}

              <form onSubmit={handlePayment} className="space-y-4">
                <Input
                  label="Full Name"
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({...formData, name: e.target.value}); setFieldErrors(prev => ({ ...prev, name: undefined })); }}
                  error={fieldErrors.name}
                  size="lg"
                />
                <Input
                  label="Email Address"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({...formData, email: e.target.value}); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                  error={fieldErrors.email}
                  size="lg"
                />
                <Input
                  label="Phone Number"
                  required
                  type="tel"
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={(e) => { setFormData({...formData, phone: e.target.value}); setFieldErrors(prev => ({ ...prev, phone: undefined })); }}
                  error={fieldErrors.phone}
                  readOnly={!!user?.phone_e164}
                  size="lg"
                />
                {user?.phone_e164 && (
                  <Link to="/profile" className="text-xs text-brand-400 hover:text-brand-300 transition mt-1 block">
                    Change →
                  </Link>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={status !== 'IDLE'}
                  disabled={status !== 'IDLE' || (!razorpayLoaded && !user)}
                  className="mt-4 py-4 shadow-lg shadow-brand-600/20"
                >
                  {status === 'IDLE' && `Pay ₹${(discountedPrice / 100).toLocaleString()}`}
                  {status === 'CREATING_ORDER' && 'Creating Order...'}
                  {status === 'PAYING' && 'Processing Payment...'}
                  {status === 'VERIFYING' && 'Verifying Payment...'}
                </Button>
              </form>
            </>
          )}

          {!user && (
            <p className="text-xs text-center mt-4 t-text-3">
              You'll be asked to sign in with Google after clicking Pay.
            </p>
          )}

          {razorpayLoaded && status === 'IDLE' && (
            <p className="text-xs text-center mt-4 t-text-3">
              Powered by Razorpay • Secure payments
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
