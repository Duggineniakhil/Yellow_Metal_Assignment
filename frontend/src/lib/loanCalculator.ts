/**
 * loanCalculator.ts (Frontend mirror)
 *
 * Client-side mirror of the backend loan calculator for instant,
 * live-updating previews. The backend calculation is ALWAYS the
 * source of truth — this is purely for UX responsiveness.
 *
 * IMPORTANT: Keep this in sync with backend/src/lib/loanCalculator.ts.
 */

// Mock gold rate — must match the backend constant
export const GOLD_RATE_PER_GRAM_INR = 6200;

// RBI regulatory cap — must match the backend constant
export const REGULATORY_MAX_LTV_PERCENT = 75;

export interface LoanPreview {
  purityFraction: number;
  pureGoldWeightGrams: number;
  goldMarketValue: number;
  effectiveLtvPercent: number;
  maxEligibleLoanAmount: number;
}

/**
 * Computes a loan eligibility preview for instant UI feedback.
 * Uses NET weight (not gross) — same as backend.
 */
export function calculateLoanPreview(
  netWeightGrams: number,
  purityKarat: number,
  schemeMaxLtvPercent: number
): LoanPreview {
  const purityFraction = purityKarat / 24;

  // Use NET weight — gross includes stones, clasps, non-gold materials
  const pureGoldWeightGrams = netWeightGrams * purityFraction;

  const goldMarketValue = pureGoldWeightGrams * GOLD_RATE_PER_GRAM_INR;

  // Cap LTV at 75% per RBI regulations
  const effectiveLtvPercent = Math.min(schemeMaxLtvPercent, REGULATORY_MAX_LTV_PERCENT);

  const maxEligibleLoanAmount = Math.round(goldMarketValue * (effectiveLtvPercent / 100) * 100) / 100;

  return {
    purityFraction,
    pureGoldWeightGrams,
    goldMarketValue,
    effectiveLtvPercent,
    maxEligibleLoanAmount,
  };
}
