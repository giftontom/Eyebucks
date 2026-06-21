/**
 * Currency + number formatting helpers.
 *
 * All monetary values in the system are stored in **paise** (1 INR = 100 paise),
 * so every helper here takes paise and renders rupees.
 */

/**
 * Full INR amount from paise, using Indian digit grouping.
 *
 * @example formatINR(14999)    // "₹149.99"
 * @example formatINR(15000000) // "₹1,50,000"
 */
export function formatINR(paise: number, maximumFractionDigits = 2): string {
  const rupees = (paise || 0) / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits, minimumFractionDigits: 0 })}`;
}

/**
 * Whole-rupee price for catalog / marketing surfaces (course cards, pricing
 * tiers, storefront). Drops paise so listings never mix `₹999` with `₹149.99`.
 *
 * House rule: use `formatPrice` for displayed *prices* (catalog), and
 * `formatINR` for exact *amounts* (receipts, payments, refunds, revenue).
 *
 * @example formatPrice(149900)  // "₹1,499"
 * @example formatPrice(15000000) // "₹1,50,000"
 */
export function formatPrice(paise: number): string {
  return formatINR(paise, 0);
}

/**
 * Compact INR for dashboard KPIs and chart axes, using Indian units (k / L / Cr).
 * Unlike a fixed "÷100000 + k" scheme, this is adaptive so small values stay legible.
 *
 * @example formatCompactINR(15000)      // "₹150"
 * @example formatCompactINR(500000)     // "₹5k"
 * @example formatCompactINR(15000000)   // "₹1.5L"
 * @example formatCompactINR(1500000000) // "₹1.5Cr"
 */
export function formatCompactINR(paise: number): string {
  const rupees = (paise || 0) / 100;
  const abs = Math.abs(rupees);
  const trim = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1));

  if (abs >= 1e7) { return `₹${trim(rupees / 1e7)}Cr`; }
  if (abs >= 1e5) { return `₹${trim(rupees / 1e5)}L`; }
  if (abs >= 1e3) { return `₹${trim(rupees / 1e3)}k`; }
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
