import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { useScript } from '../hooks/useScript';
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
    apiClient.getCourse(id)
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

  // Check if user already owns this course
  useEffect(() => {
    const checkOwnership = async () => {
      if (user && id) {
        try {
          const response = await apiClient.checkAccess(user.id, id);
          setAlreadyOwned(response.hasAccess);
        } catch (error) {
          console.error('Error checking ownership:', error);
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Course not found</h2>
          <Link to="/" className="text-brand-600 hover:text-brand-700 font-bold">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Loading ownership check
  if (isCheckingOwnership) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={48} />
      </div>
    );
  }

  // If already owned, show message
  if (alreadyOwned) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-slate-900">You already own this course!</h2>
          <p className="text-slate-600 mb-6">
            You have full access to all course materials.
          </p>
          <Link
            to={`/learn/${id}`}
            className="block w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg transition mb-3"
          >
            Go to Course
          </Link>
          <Link
            to="/dashboard"
            className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium py-3 rounded-lg transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setWarningMessage('');

    if (!user) {
      await login();
      return;
    }

    try {
      // Step 1: Create Order
      setStatus('CREATING_ORDER');

      const orderResponse = await apiClient.createOrder({
        courseId: course.id,
        userId: user.id
      });

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
      console.error('[Checkout] Error:', error);
      setStatus('IDLE');
      setErrorMessage(error.message || 'Payment failed. Please try again.');
    }
  };

  const handlePaymentSuccess = async (response: RazorpayResponse, orderId: string) => {
    try {
      setStatus('VERIFYING');

      const verifyResponse = await apiClient.verifyPayment({
        orderId: orderId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
        courseId: course.id,
        userId: user!.id
      });

      if (verifyResponse.verified) {
        logger.info('[Checkout] Payment verified, enrollment created:', verifyResponse.enrollmentId);
        setStatus('SUCCESS');

        // Redirect to success page after 1.5 seconds
        setTimeout(() => {
          navigate(`/success?courseId=${course.id}`);
        }, 1500);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error: any) {
      console.error('[Checkout] Verification error:', error);
      setStatus('IDLE');
      setErrorMessage('Payment verification failed. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">

        {/* Left: Order Summary */}
        <div className="p-8 bg-slate-50 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Order Summary</h2>
            <div className="flex gap-4 mb-6">
              <img src={course.thumbnail} className="w-24 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" alt="Course" />
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">{course.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{course.type}</p>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{(course.price / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600 text-sm">
                <span>Discount</span>
                <span>- ₹0</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>Total Due</span>
                <span>₹{(course.price / 100).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-slate-500 text-sm mt-8 bg-white p-3 rounded-lg border border-slate-200">
            <ShieldCheck size={16} className="text-green-500" />
            <span>SSL Secure Payment • 256-bit Encryption</span>
          </div>
        </div>

        {/* Right: Payment Form */}
        <div className="p-8 relative">
          {status === 'SUCCESS' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20 animate-fade-in">
              <CheckCircle2 size={64} className="text-green-500 mb-4" />
              <h3 className="text-2xl font-bold text-slate-900">Payment Successful!</h3>
              <p className="text-slate-500 mt-2">Redirecting to your studio...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-6 text-slate-900">Secure Checkout</h2>

              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              {warningMessage && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                  <strong>⚠️ Development Mode:</strong> {warningMessage}
                </div>
              )}

              {!razorpayLoaded && !warningMessage && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                  Loading payment gateway...
                </div>
              )}

              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Email Address</label>
                  <input
                    required
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-1">Phone Number</label>
                  <input
                    required
                    type="tel"
                    placeholder="+1..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none transition"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    readOnly={!!user?.phone_e164}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status !== 'IDLE' || (!razorpayLoaded && !user)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-lg mt-4 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {status === 'IDLE' && `Pay ₹${(course.price / 100).toLocaleString()}`}
                  {status === 'CREATING_ORDER' && <><Loader2 className="animate-spin" size={20} /> Creating Order...</>}
                  {status === 'PAYING' && <><Loader2 className="animate-spin" size={20} /> Processing Payment...</>}
                  {status === 'VERIFYING' && <><Loader2 className="animate-spin" size={20} /> Verifying Payment...</>}
                </button>
              </form>
            </>
          )}

          {!user && (
            <p className="text-xs text-center mt-4 text-slate-400">
              You'll be asked to sign in with Google after clicking Pay.
            </p>
          )}

          {razorpayLoaded && status === 'IDLE' && (
            <p className="text-xs text-center mt-4 text-slate-400">
              Powered by Razorpay • Secure payments
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
