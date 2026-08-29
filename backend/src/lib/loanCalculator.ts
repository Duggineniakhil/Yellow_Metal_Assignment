/**
 * loanCalculator.ts
 *
 * Pure, unit-testable functions for gold loan eligibility calculations.
 * All monetary/weight math lives in this file.
 *
 * This module is intentionally free of database or HTTP concerns —
 * it can be imported and tested in isolation.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Mock gold rate per gram in INR.
 * In production, replace this with a call to a live gold rate API
 * (e.g., Metal Price API, GoldAPI.io, or an internal pricing service).
 */
export const GOLD_RATE_PER_GRAM_INR = 6200;

/**
 * RBI regulatory cap on Loan-to-Value ratio for gold loans.
 * Even if a scheme's maxLtvPercent is set higher (due to a data error),
 * the actual LTV used in calculations must never exceed this value.
 */
export const REGULATORY_MAX_LTV_PERCENT = 75;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoanCalculationInput {
  /** Net weight of the gold in grams (after deducting stones, clasps, etc.) */
  netWeightGrams: number;

  /** Purity of gold in karats — must be 18, 22, or 24 */
  purityKarat: number;

  /** Maximum LTV percentage from the selected loan scheme */
  schemeMaxLtvPercent: number;
}

export interface LoanCalculationResult {
  /** Fraction of pure gold (e.g., 22K → 0.9167) */
  purityFraction: number;

  /** Weight of pure gold = netWeightGrams × purityFraction */
  pureGoldWeightGrams: number;

  /** Gold rate per gram used in the calculation (INR) */
  goldRatePerGramInr: number;

  /** Market value of the pure gold content (INR) */
  goldMarketValue: number;

  /** Effective LTV percentage applied (capped at 75%) */
  effectiveLtvPercent: number;

  /** Maximum eligible loan amount (INR), rounded to 2 decimal places */
  maxEligibleLoanAmount: number;
}

// ─── Core Calculation ────────────────────────────────────────────────────────

/**
 * Calculates the maximum eligible gold loan amount.
 *
 * Formula breakdown:
 *   1. purityFraction = purityKarat / 24
 *      - 24K is pure gold, so 22K = 22/24 ≈ 91.67% pure
 *
 *   2. pureGoldWeightGrams = netWeightGrams × purityFraction
 *      - IMPORTANT: We use NET weight here, not GROSS weight.
 *        Gross weight includes stones, clasps, and other non-gold materials.
 *        Using gross weight would overstate the gold content — a common
 *        mistake that must be explicitly guarded against.
 *
 *   3. goldMarketValue = pureGoldWeightGrams × GOLD_RATE_PER_GRAM_INR
 *      - The total market value of the pure gold content at current rates.
 *
 *   4. effectiveLtvPercent = min(schemeMaxLtvPercent, REGULATORY_MAX_LTV_PERCENT)
 *      - Even if the scheme allows higher LTV, RBI caps gold loan LTV at 75%.
 *
 *   5. maxEligibleLoanAmount = goldMarketValue × (effectiveLtvPercent / 100)
 *      - Rounded to 2 decimal places for currency precision.
 *
 * @param input - The calculation input parameters
 * @returns The detailed calculation result
 */
export function calculateLoanEligibility(
  input: LoanCalculationInput
): LoanCalculationResult {
  const { netWeightGrams, purityKarat, schemeMaxLtvPercent } = input;

  // Step 1: Convert karat to a fraction of pure gold
  // 24K = 100% pure, 22K = 91.67% pure, 18K = 75% pure
  const purityFraction = purityKarat / 24;

  // Step 2: Calculate pure gold weight using NET weight (not gross!)
  // Net weight excludes stones, clasps, and non-gold materials
  const pureGoldWeightGrams = netWeightGrams * purityFraction;

  // Step 3: Determine the market value of the pure gold
  const goldRatePerGramInr = GOLD_RATE_PER_GRAM_INR;
  const goldMarketValue = pureGoldWeightGrams * goldRatePerGramInr;

  // Step 4: Apply the LTV cap — never exceed 75% per RBI regulations
  const effectiveLtvPercent = Math.min(
    schemeMaxLtvPercent,
    REGULATORY_MAX_LTV_PERCENT
  );

  // Step 5: Calculate the maximum loan amount, rounded to 2 decimal places
  const maxEligibleLoanAmount = roundToTwoDecimals(
    goldMarketValue * (effectiveLtvPercent / 100)
  );

  return {
    purityFraction,
    pureGoldWeightGrams,
    goldRatePerGramInr,
    goldMarketValue,
    effectiveLtvPercent,
    maxEligibleLoanAmount,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Rounds a number to exactly 2 decimal places.
 * Uses Math.round to avoid floating-point precision issues.
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
