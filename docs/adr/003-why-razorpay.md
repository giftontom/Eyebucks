# ADR-003: Why Razorpay for Payments

> **Status:** Accepted
> **Date:** 2026-03-14 | **Deciders:** core maintainers
> **Supersedes:** N/A | **Superseded by:** N/A

## Context

Eyebuckz is an Indian LMS. The payment provider must support Indian payment methods (UPI,
net banking, Indian credit/debit cards) and operate in INR. The provider's secret keys must
never be exposed to the frontend.

## Decision Drivers

- Must support UPI (dominant Indian payment method)
- Must operate in INR
- Secret keys must stay server-side
- Webhook support required for async payment confirmation
- HMAC-based signature verification for payment integrity

## Options Considered

### Option A: Stripe
- Pro: Excellent developer experience; widely documented
- Con: Limited UPI support in India at the time of decision
- Con: Requires additional compliance work for Indian market

### Option B: Razorpay *(chosen)*
- Pro: Native UPI, net banking, wallet support
- Pro: INR-native; widely used in Indian market
- Pro: HMAC-SHA256 payment signature verification
- Pro: Webhook for async confirmation (handles browser close mid-payment)
- Con: INR-only; international expansion requires adding another provider
- Con: Razorpay checkout SDK loaded via CDN (not npm package)

### Option C: PayU
- Pro: Indian market support
- Con: Less developer-friendly; less comprehensive documentation

## Decision

**We chose Razorpay** because it natively supports Indian payment methods (especially UPI),
operates in INR, and provides HMAC-based signature verification for payment integrity.

## Consequences

### Positive
- Full UPI + net banking + card support out of the box
- HMAC verification pattern (`checkout-verify` Edge Function) ensures payments cannot be
  faked by manipulating frontend responses
- Webhook fallback (`checkout-webhook` Edge Function) handles the case where the user closes
  the browser after payment but before the success callback fires

### Negative / Trade-offs
- INR-only: international expansion requires adding Stripe or another provider
  — Mitigation: the `checkout.api.ts` abstraction layer isolates Razorpay; swapping is a single-module change
- Razorpay checkout SDK loaded via CDN (`useScript` hook) — adds a runtime dependency
  — Mitigation: `useScript` has a deduplication guard; failure is surfaced via `error` state

### Risks
- **Webhook HMAC verification:** `checkout-webhook` Edge Function has no JWT auth (called by
  Razorpay, not the frontend). If the HMAC check is ever weakened or bypassed, an attacker
  could fake enrollment creation.
  — Mitigation: Never remove the HMAC check from `checkout-webhook/index.ts`

## Links

- `supabase/functions/checkout-verify/index.ts`
- `supabase/functions/checkout-webhook/index.ts`
- `services/api/checkout.api.ts`
