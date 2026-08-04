import { Loader2, CheckCircle2, Download, ArrowLeft, Tag, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { Button, Thumbnail, TrustBadges } from '../components';
import { useAuth } from '../context/AuthContext';
import { useScript } from '../hooks/useScript';
import { checkoutApi, couponsApi, digitalAssetsApi } from '../services/api';
import { supabase } from '../services/supabase';
import { analytics } from '../utils/analytics';
import { formatINR } from '../utils/format';
import { logger } from '../utils/logger';

import type { DigitalAsset } from '../types';

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

type Status = 'IDLE' | 'CREATING_ORDER' | 'PAYING' | 'VERIFYING' | 'SUCCESS';

export const AssetCheckout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const razorpayLoaded = useScript('https://checkout.razorpay.com/v1/checkout.js');

  const [asset, setAsset] = useState<DigitalAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  const [status, setStatus] = useState<Status>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponUseId, setCouponUseId] = useState<string | undefined>(undefined);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const discountedPrice = asset ? Math.round(asset.price * (1 - couponDiscount / 100)) : 0;

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let active = true;
    digitalAssetsApi.getAssetById(id)
      .then(async (a) => {
        if (!active) { return; }
        setAsset(a);
        if (a) {
          analytics.track('checkout_started', { asset_id: a.id, asset_title: a.title, price: a.price });
          // Free assets are claimed from the detail page, not here.
          if (a.price <= 0) { navigate(`/asset/${a.slug}`, { replace: true }); return; }
          try {
            const owned = await digitalAssetsApi.checkOwnership(a.id);
            if (active) { setAlreadyOwned(owned); }
          } catch (err) { logger.warn('[AssetCheckout] ownership check failed:', err); }
        }
      })
      .catch((err) => logger.error('[AssetCheckout] failed to load asset:', err))
      .finally(() => { if (active) { setLoading(false); } });
    return () => { active = false; };
  }, [id, navigate]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !asset) { return; }
    setCouponLoading(true);
    setCouponError('');
    try {
      const result = await couponsApi.applyAssetCoupon(couponInput, asset.id);
      setCouponDiscount(result.discountPct);
      setCouponUseId(result.couponUseId);
      setCouponApplied(true);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon');
      setCouponDiscount(0);
      setCouponUseId(undefined);
      setCouponApplied(false);
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: RazorpayResponse, orderId: string) => {
    if (!asset) { return; }
    try {
      setStatus('VERIFYING');
      const result = await checkoutApi.verifyAssetPayment({
        orderId,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
        assetId: asset.id,
        couponUseId,
      });
      if (!result.verified) { throw new Error('Payment verification failed'); }
      analytics.track('payment_completed', { asset_id: asset.id, asset_title: asset.title, order_id: orderId, amount: asset.price });
      setStatus('SUCCESS');
      setTimeout(() => navigate(`/asset/${asset.slug}`), 1500);
    } catch (err) {
      logger.error('[AssetCheckout] verification error:', err);
      setStatus('IDLE');
      setErrorMessage('Payment verification failed. Please contact support.');
    }
  };

  const handlePay = async () => {
    if (!asset) { return; }
    setErrorMessage('');

    if (!user) {
      try { await login(); } catch { setErrorMessage('Login cancelled. Please try again.'); }
      return;
    }

    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !session) {
        setErrorMessage('Your session expired. Please log in again.');
        await login();
        return;
      }

      setStatus('CREATING_ORDER');
      const order = await checkoutApi.createAssetOrder(asset.id, couponUseId);

      const RazorpayCtor = (window as unknown as {
        Razorpay?: new (options: RazorpayOptions) => { open: () => void };
      }).Razorpay;

      if (razorpayLoaded && RazorpayCtor) {
        setStatus('PAYING');
        const rzp = new RazorpayCtor({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: 'Eyebuckz',
          description: order.title,
          order_id: order.orderId,
          handler: (response: RazorpayResponse) => handlePaymentSuccess(response, order.orderId),
          prefill: { name: user.name, email: user.email, contact: user.phone_e164 || '' },
          theme: { color: '#ef4444' },
          modal: { ondismiss: () => { setStatus('IDLE'); setErrorMessage('Payment cancelled'); } },
        });
        rzp.open();
      } else if (import.meta.env.DEV) {
        setStatus('PAYING');
        await new Promise(r => setTimeout(r, 1500));
        await handlePaymentSuccess(
          { razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_order_id: order.orderId, razorpay_signature: 'mock_signature' },
          order.orderId,
        );
      } else {
        setStatus('IDLE');
        setErrorMessage('Payment gateway failed to load. Please refresh and try again.');
      }
    } catch (err) {
      logger.error('[AssetCheckout] error:', err);
      setStatus('IDLE');
      setErrorMessage(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center t-bg"><Loader2 className="animate-spin text-brand-600" size={48} /></div>;
  }

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center t-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold t-text mb-4">Asset not found</h2>
          <Link to="/assets" className="text-brand-400 hover:text-brand-300 font-bold">Back to Shop</Link>
        </div>
      </div>
    );
  }

  if (alreadyOwned) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 t-bg">
        <div className="max-w-md w-full text-center t-card p-8 rounded-xl t-border border">
          <div className="w-16 h-16 t-status-success border rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
          <h2 className="text-2xl font-bold mb-4 t-text">You already own this asset</h2>
          <Link to={`/asset/${asset.slug}`} className="inline-flex items-center justify-center gap-2 w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg transition">
            <Download size={18} /> Go to download
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen t-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 rounded-3xl overflow-hidden t-border border">
        {/* Summary */}
        <div className="p-8 t-bg-alt">
          <Link to={`/asset/${asset.slug}`} className="inline-flex items-center gap-2 text-sm t-text-2 hover:t-text transition mb-6">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="rounded-2xl overflow-hidden t-border border aspect-[4/3] mb-5">
            <Thumbnail src={asset.thumbnail} alt={asset.title} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-bold t-text mb-2">{asset.title}</h2>
          <p className="t-text-2 text-sm line-clamp-3 mb-4">{asset.description}</p>

          {/* Coupon */}
          <div className="border-t t-border pt-4 mb-4">
            {couponApplied ? (
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5 t-status-success px-2 py-1 rounded-lg font-medium">
                  <Check size={14} /> {couponDiscount}% off applied
                </span>
                <button
                  onClick={() => { setCouponApplied(false); setCouponDiscount(0); setCouponUseId(undefined); setCouponInput(''); }}
                  className="text-xs t-text-3 hover:t-text underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 t-text-3" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(''); }}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    className="w-full pl-9 pr-3 py-2 t-input-bg t-border border rounded-lg text-sm t-text outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-4 py-2 t-card t-border border rounded-lg text-sm font-bold t-text hover:bg-[var(--surface-hover)] disabled:opacity-50 transition"
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>
            )}
            {couponError && <p className="text-xs t-status-danger mt-2">{couponError}</p>}
          </div>

          <div className="flex items-center justify-between border-t t-border pt-4">
            <span className="t-text-2">Total</span>
            <span className="flex items-baseline gap-2">
              {couponDiscount > 0 && <span className="text-sm t-text-3 line-through">{formatINR(asset.price)}</span>}
              <span className="text-2xl font-bold t-text">{formatINR(discountedPrice)}</span>
            </span>
          </div>
        </div>

        {/* Payment */}
        <div className="p-8 relative t-bg">
          {status === 'SUCCESS' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 animate-fade-in">
              <CheckCircle2 size={64} className="mb-4" style={{ color: 'var(--status-success-text)' }} />
              <h3 className="text-2xl font-bold text-white">Payment Successful!</h3>
              <p className="text-white/70 mt-2">Taking you to your download...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-6 t-text">Secure Checkout</h2>
              {errorMessage && (
                <div className="mb-4 p-3 t-status-danger border rounded-lg text-sm flex items-center justify-between gap-3">
                  <span>{errorMessage}</span>
                  <button onClick={() => { setErrorMessage(''); setStatus('IDLE'); }} className="text-xs font-bold underline shrink-0 opacity-80 hover:opacity-100">Try Again</button>
                </div>
              )}
              {!razorpayLoaded && (
                <div className="mb-4 p-3 t-status-warning border rounded-lg text-sm">Loading payment gateway...</div>
              )}
              <TrustBadges className="mb-4" />
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                loading={status !== 'IDLE'}
                disabled={status !== 'IDLE' || (!razorpayLoaded && !!user)}
                onClick={handlePay}
                className="py-4 shadow-lg shadow-brand-600/20"
              >
                {status === 'IDLE' && `Pay ${formatINR(discountedPrice)}`}
                {status === 'CREATING_ORDER' && 'Creating Order...'}
                {status === 'PAYING' && 'Processing Payment...'}
                {status === 'VERIFYING' && 'Verifying Payment...'}
              </Button>
              {!user && <p className="text-xs text-center mt-4 t-text-3">You will be asked to sign in with Google after clicking Pay.</p>}
              {razorpayLoaded && status === 'IDLE' && <p className="text-xs text-center mt-4 t-text-3">Powered by Razorpay • Secure payments</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
