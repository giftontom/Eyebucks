import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MOCK_COURSES } from '../constants';
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { enrollmentService } from '../services/enrollmentService';

export const Checkout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const course = MOCK_COURSES.find(c => c.id === id);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  const [status, setStatus] = useState<'IDLE' | 'CREATING_ORDER' | 'PAYING' | 'VERIFYING' | 'SUCCESS'>('IDLE');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone_e164 || ''
  });

  // Check if user already owns this course
  useEffect(() => {
    const checkOwnership = () => {
      if (user && id) {
        const owned = enrollmentService.hasAccess(user.id, id);
        setAlreadyOwned(owned);
      }
    };
    checkOwnership();
  }, [user, id]);

  if (!course) return null;

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
    if (!user) {
        await login();
        return; 
    }

    // Step 1: Create Order on Server
    setStatus('CREATING_ORDER');
    
    // Simulate API call to POST /api/checkout/create-order
    setTimeout(() => {
        // Step 2: Simulate Razorpay Standard Checkout Launch
        setStatus('PAYING');
        
        // Simulate User completing payment in Razorpay Modal
        setTimeout(() => {
            // Step 3: Webhook Verification
            setStatus('VERIFYING');

            // Simulate Server receiving webhook payment.captured
            setTimeout(() => {
                // CREATE ENROLLMENT HERE!
                const paymentId = `pay_${Date.now()}`;
                const orderId = `order_${Date.now()}`;

                enrollmentService.enrollUser({
                  userId: user!.id,
                  courseId: course!.id,
                  paymentId,
                  orderId,
                  amount: course!.price
                });

                console.log('[Checkout] Enrollment created successfully!');

                setStatus('SUCCESS');
                // Step 4: Redirect to dashboard
                setTimeout(() => navigate('/dashboard'), 1500);
            }, 1500);

        }, 2000);
    }, 1000);
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
                  <span>₹{course.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Discount</span>
                  <span>- ₹0</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                  <span>Total Due</span>
                  <span>₹{course.price.toLocaleString()}</span>
                </div>
              </div>
           </div>
           
           <div className="relative z-10 flex items-center gap-2 text-slate-500 text-sm mt-8 bg-white p-3 rounded-lg border border-slate-200">
              <ShieldCheck size={16} className="text-green-500" />
              <span>SSL Secure Payment • 256-bit Encryption</span>
           </div>
        </div>

        {/* Right: Minimalist Form */}
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
                    disabled={status !== 'IDLE'}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-lg mt-4 transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70"
                    >
                    {status === 'IDLE' && `Pay ₹${course.price.toLocaleString()}`}
                    {status === 'CREATING_ORDER' && <><Loader2 className="animate-spin" /> Creating Order...</>}
                    {status === 'PAYING' && <><Loader2 className="animate-spin" /> Processing Razorpay...</>}
                    {status === 'VERIFYING' && <><Loader2 className="animate-spin" /> Verifying Webhook...</>}
                    </button>
                </form>
               </>
           )}
           
           {!user && (
             <p className="text-xs text-center mt-4 text-slate-400">
               You'll be asked to sign in with Google after clicking Pay.
             </p>
           )}
        </div>

      </div>
    </div>
  );
};