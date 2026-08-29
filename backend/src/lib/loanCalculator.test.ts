/**
 * loanCalculator.test.ts
 *
 * Simple test script for the loan calculator.
 * Run with: npx tsx src/lib/loanCalculator.test.ts
 *
 * This uses plain assertions (no test framework required) to keep
 * dependencies minimal. Replace with Jest/Vitest for CI.
 */

import {
  calculateLoanEligibility,
  GOLD_RATE_PER_GRAM_INR,
  REGULATORY_MAX_LTV_PERCENT,
  LoanCalculationInput,
} from "./loanCalculator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function assertClose(actual: number, expected: number, message: string, tolerance = 0.01): void {
  assert(Math.abs(actual - expected) < tolerance, `${message} (got ${actual}, expected ${expected})`);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

console.log("\n🧪 Loan Calculator Tests\n");

// Test 1: 22K gold, 45g net, 75% LTV (Bullet Plan)
console.log("Test 1: 22K gold, 45g net, 75% LTV (Bullet Repayment Plan)");
{
  const input: LoanCalculationInput = {
    netWeightGrams: 45,
    purityKarat: 22,
    schemeMaxLtvPercent: 75,
  };
  const result = calculateLoanEligibility(input);

  // purityFraction = 22/24 = 0.9167
  assertClose(result.purityFraction, 22 / 24, "Purity fraction = 22/24");

  // pureGoldWeight = 45 * (22/24) = 41.25
  assertClose(result.pureGoldWeightGrams, 41.25, "Pure gold weight = 41.25g");

  // goldMarketValue = 41.25 * 6200 = 255,750
  assertClose(result.goldMarketValue, 255750, "Gold market value = ₹255,750");

  // maxLoan = 255750 * 0.75 = 191,812.50
  assertClose(result.maxEligibleLoanAmount, 191812.5, "Max loan = ₹191,812.50");

  assert(result.effectiveLtvPercent === 75, "Effective LTV = 75%");
  assert(result.goldRatePerGramInr === GOLD_RATE_PER_GRAM_INR, `Gold rate = ₹${GOLD_RATE_PER_GRAM_INR}`);
}

// Test 2: 24K gold, 10g net, 65% LTV (EMI Plan)
console.log("\nTest 2: 24K gold, 10g net, 65% LTV (Monthly EMI Plan)");
{
  const input: LoanCalculationInput = {
    netWeightGrams: 10,
    purityKarat: 24,
    schemeMaxLtvPercent: 65,
  };
  const result = calculateLoanEligibility(input);

  // purityFraction = 24/24 = 1.0
  assertClose(result.purityFraction, 1.0, "Purity fraction = 1.0 (pure gold)");

  // pureGoldWeight = 10 * 1.0 = 10
  assertClose(result.pureGoldWeightGrams, 10, "Pure gold weight = 10g");

  // goldMarketValue = 10 * 6200 = 62,000
  assertClose(result.goldMarketValue, 62000, "Gold market value = ₹62,000");

  // maxLoan = 62000 * 0.65 = 40,300
  assertClose(result.maxEligibleLoanAmount, 40300, "Max loan = ₹40,300");

  assert(result.effectiveLtvPercent === 65, "Effective LTV = 65% (scheme cap, under 75%)");
}

// Test 3: 18K gold, 100g net, 80% LTV (should be capped at 75%)
console.log("\nTest 3: 18K gold, 100g net, 80% LTV (should cap at 75%)");
{
  const input: LoanCalculationInput = {
    netWeightGrams: 100,
    purityKarat: 18,
    schemeMaxLtvPercent: 80, // Exceeds regulatory cap
  };
  const result = calculateLoanEligibility(input);

  // purityFraction = 18/24 = 0.75
  assertClose(result.purityFraction, 0.75, "Purity fraction = 0.75");

  // pureGoldWeight = 100 * 0.75 = 75
  assertClose(result.pureGoldWeightGrams, 75, "Pure gold weight = 75g");

  // goldMarketValue = 75 * 6200 = 465,000
  assertClose(result.goldMarketValue, 465000, "Gold market value = ₹465,000");

  // LTV should be capped at 75% despite scheme saying 80%
  assert(result.effectiveLtvPercent === REGULATORY_MAX_LTV_PERCENT, "LTV capped at 75% (regulatory limit)");

  // maxLoan = 465000 * 0.75 = 348,750
  assertClose(result.maxEligibleLoanAmount, 348750, "Max loan = ₹348,750 (with 75% cap)");
}

// Test 4: Verify NET weight is used, not gross
console.log("\nTest 4: Confirm calculation uses netWeightGrams (not gross)");
{
  // If someone mistakenly passes gross weight as net, the result would differ
  const netResult = calculateLoanEligibility({
    netWeightGrams: 45,
    purityKarat: 22,
    schemeMaxLtvPercent: 75,
  });

  const grossResult = calculateLoanEligibility({
    netWeightGrams: 50, // Simulating gross weight passed as net
    purityKarat: 22,
    schemeMaxLtvPercent: 75,
  });

  assert(
    netResult.maxEligibleLoanAmount !== grossResult.maxEligibleLoanAmount,
    "Different weights produce different loan amounts (confirming net weight matters)"
  );
  assert(
    netResult.maxEligibleLoanAmount < grossResult.maxEligibleLoanAmount,
    "Net weight (45g) produces lower loan than gross (50g) — correct behavior"
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} assertions`);

if (failed > 0) {
  console.error("\n⚠️  Some tests failed!\n");
  process.exit(1);
} else {
  console.log("\n✅ All tests passed!\n");
  process.exit(0);
}
