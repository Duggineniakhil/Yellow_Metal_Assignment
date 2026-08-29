import { useState, useEffect, useMemo } from "react";
import {
  type LoanScheme,
  type LeadResponse,
  fetchLoanSchemes,
  submitLead,
} from "../lib/api";
import { calculateLoanPreview } from "../lib/loanCalculator";

// ─── Validation Helpers ──────────────────────────────────────────────────────

/**
 * Indian mobile number regex — must start with 6-9, exactly 10 digits.
 * We do NOT use /^\d{10}$/ because that accepts numbers starting with 0-5,
 * which are not valid Indian mobile prefixes.
 */
const MOBILE_REGEX = /^[6-9]\d{9}$/;

interface FormData {
  customerName: string;
  mobileNumber: string;
  grossWeightGrams: string;
  netWeightGrams: string;
  purityKarat: string;
  selectedPlanId: string;
}

interface FormErrors {
  customerName?: string;
  mobileNumber?: string;
  grossWeightGrams?: string;
  netWeightGrams?: string;
  purityKarat?: string;
  selectedPlanId?: string;
}

const INITIAL_FORM: FormData = {
  customerName: "",
  mobileNumber: "",
  grossWeightGrams: "",
  netWeightGrams: "",
  purityKarat: "",
  selectedPlanId: "",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LeadForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [schemes, setSchemes] = useState<LoanScheme[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<LeadResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [apiFieldErrors, setApiFieldErrors] = useState<Record<string, string>>({});

  // Fetch loan schemes on mount
  useEffect(() => {
    fetchLoanSchemes()
      .then(setSchemes)
      .catch((err) => console.error("Failed to load schemes:", err));
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateStep1(): FormErrors {
    const errs: FormErrors = {};

    if (!form.customerName.trim()) {
      errs.customerName = "Customer name is required.";
    }

    if (!form.mobileNumber.trim()) {
      errs.mobileNumber = "Mobile number is required.";
    } else if (!MOBILE_REGEX.test(form.mobileNumber)) {
      errs.mobileNumber = "Enter a valid 10-digit Indian mobile number (starts with 6-9).";
    }

    const gross = parseFloat(form.grossWeightGrams);
    const net = parseFloat(form.netWeightGrams);

    if (!form.grossWeightGrams || isNaN(gross) || gross <= 0) {
      errs.grossWeightGrams = "Gross weight must be a positive number.";
    }

    if (!form.netWeightGrams || isNaN(net) || net <= 0) {
      errs.netWeightGrams = "Net weight must be a positive number.";
    } else if (!isNaN(gross) && net > gross) {
      errs.netWeightGrams = "Net weight cannot exceed gross weight.";
    }

    if (!form.purityKarat) {
      errs.purityKarat = "Please select gold purity.";
    }

    return errs;
  }

  // ── Live Calculator Preview ────────────────────────────────────────────────

  const selectedScheme = schemes.find((s) => s.id === form.selectedPlanId);

  const loanPreview = useMemo(() => {
    const net = parseFloat(form.netWeightGrams);
    const karat = parseInt(form.purityKarat);
    if (!net || !karat || !selectedScheme) return null;
    if (net <= 0 || ![18, 22, 24].includes(karat)) return null;
    return calculateLoanPreview(net, karat, selectedScheme.maxLtvPercent);
  }, [form.netWeightGrams, form.purityKarat, selectedScheme]);

  // Preview without scheme selection (use 75% LTV for generic preview)
  const genericPreview = useMemo(() => {
    const net = parseFloat(form.netWeightGrams);
    const karat = parseInt(form.purityKarat);
    if (!net || !karat) return null;
    if (net <= 0 || ![18, 22, 24].includes(karat)) return null;
    return calculateLoanPreview(net, karat, 75);
  }, [form.netWeightGrams, form.purityKarat]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear errors as user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiFieldErrors[field]) {
      setApiFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  }

  function handleNext() {
    const errs = validateStep1();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setStep(2);
    }
  }

  function handleSelectScheme(schemeId: string) {
    handleChange("selectedPlanId", schemeId);
  }

  function handleProceedToSubmit() {
    if (!form.selectedPlanId) {
      setErrors((prev) => ({ ...prev, selectedPlanId: "Please select a loan scheme." }));
      return;
    }
    setStep(3);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setApiFieldErrors({});

    try {
      const payload = {
        customerName: form.customerName.trim(),
        mobileNumber: form.mobileNumber.trim(),
        grossWeightGrams: parseFloat(form.grossWeightGrams),
        netWeightGrams: parseFloat(form.netWeightGrams),
        purityKarat: parseInt(form.purityKarat),
        selectedPlanId: form.selectedPlanId,
      };

      const result = await submitLead(payload);

      if (result.success) {
        setSubmitResult(result.data);
        setStep(4); // Confirmation screen
      } else {
        if (result.status === 409) {
          setSubmitError(result.error.error);
        } else if (result.status === 400) {
          setSubmitError(result.error.error);
          if (result.error.fieldErrors) {
            setApiFieldErrors(result.error.fieldErrors);
            // If there are field errors from Step 1 fields, go back to Step 1
            const step1Fields = ["customerName", "mobileNumber", "grossWeightGrams", "netWeightGrams", "purityKarat"];
            const hasStep1Errors = Object.keys(result.error.fieldErrors).some((f) =>
              step1Fields.includes(f)
            );
            if (hasStep1Errors) setStep(1);
          }
        } else {
          setSubmitError(result.error.error || "An unexpected error occurred.");
        }
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNewApplication() {
    setForm(INITIAL_FORM);
    setErrors({});
    setSubmitResult(null);
    setSubmitError(null);
    setApiFieldErrors({});
    setStep(1);
  }

  // ── Format Helpers ─────────────────────────────────────────────────────────

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      {step < 4 && (
        <div className="flex items-center justify-center mb-8 gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step >= s
                    ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 shadow-lg shadow-amber-500/30"
                    : "bg-gray-800 text-gray-500 border border-gray-700"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-0.5 mx-1 transition-all duration-300 ${
                    step > s ? "bg-amber-500" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Step 1: Customer & Gold Details ──────────────────────────────── */}
      {step === 1 && (
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-1">Customer & Gold Details</h2>
          <p className="text-gray-400 mb-6 text-sm">Enter borrower information and gold collateral details.</p>

          <div className="space-y-5">
            {/* Customer Name */}
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-300 mb-1.5">
                Customer Name
              </label>
              <input
                id="customerName"
                type="text"
                value={form.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className={`w-full px-4 py-3 bg-gray-800/60 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.customerName || apiFieldErrors.customerName
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-700 focus:ring-amber-500/50 focus:border-amber-500"
                }`}
              />
              {(errors.customerName || apiFieldErrors.customerName) && (
                <p className="mt-1 text-sm text-red-400">{errors.customerName || apiFieldErrors.customerName}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-300 mb-1.5">
                Mobile Number
              </label>
              <input
                id="mobileNumber"
                type="tel"
                maxLength={10}
                value={form.mobileNumber}
                onChange={(e) => handleChange("mobileNumber", e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 9876543210"
                className={`w-full px-4 py-3 bg-gray-800/60 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.mobileNumber || apiFieldErrors.mobileNumber
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-700 focus:ring-amber-500/50 focus:border-amber-500"
                }`}
              />
              {(errors.mobileNumber || apiFieldErrors.mobileNumber) && (
                <p className="mt-1 text-sm text-red-400">{errors.mobileNumber || apiFieldErrors.mobileNumber}</p>
              )}
            </div>

            {/* Weight Fields - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="grossWeight" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Gross Weight (g)
                </label>
                <input
                  id="grossWeight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.grossWeightGrams}
                  onChange={(e) => handleChange("grossWeightGrams", e.target.value)}
                  placeholder="e.g. 50"
                  className={`w-full px-4 py-3 bg-gray-800/60 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    errors.grossWeightGrams || apiFieldErrors.grossWeightGrams
                      ? "border-red-500 focus:ring-red-500/50"
                      : "border-gray-700 focus:ring-amber-500/50 focus:border-amber-500"
                  }`}
                />
                {(errors.grossWeightGrams || apiFieldErrors.grossWeightGrams) && (
                  <p className="mt-1 text-sm text-red-400">{errors.grossWeightGrams || apiFieldErrors.grossWeightGrams}</p>
                )}
              </div>
              <div>
                <label htmlFor="netWeight" className="block text-sm font-medium text-gray-300 mb-1.5">
                  Net Weight (g)
                </label>
                <input
                  id="netWeight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.netWeightGrams}
                  onChange={(e) => handleChange("netWeightGrams", e.target.value)}
                  placeholder="e.g. 45"
                  className={`w-full px-4 py-3 bg-gray-800/60 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    errors.netWeightGrams || apiFieldErrors.netWeightGrams
                      ? "border-red-500 focus:ring-red-500/50"
                      : "border-gray-700 focus:ring-amber-500/50 focus:border-amber-500"
                  }`}
                />
                {(errors.netWeightGrams || apiFieldErrors.netWeightGrams) && (
                  <p className="mt-1 text-sm text-red-400">{errors.netWeightGrams || apiFieldErrors.netWeightGrams}</p>
                )}
              </div>
            </div>

            {/* Purity Dropdown */}
            <div>
              <label htmlFor="purityKarat" className="block text-sm font-medium text-gray-300 mb-1.5">
                Gold Purity
              </label>
              <select
                id="purityKarat"
                value={form.purityKarat}
                onChange={(e) => handleChange("purityKarat", e.target.value)}
                className={`w-full px-4 py-3 bg-gray-800/60 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                  errors.purityKarat || apiFieldErrors.purityKarat
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-gray-700 focus:ring-amber-500/50 focus:border-amber-500"
                } ${!form.purityKarat ? "text-gray-500" : ""}`}
              >
                <option value="" disabled>Select purity</option>
                <option value="18">18 Karat (75% pure)</option>
                <option value="22">22 Karat (91.67% pure)</option>
                <option value="24">24 Karat (99.9% pure)</option>
              </select>
              {(errors.purityKarat || apiFieldErrors.purityKarat) && (
                <p className="mt-1 text-sm text-red-400">{errors.purityKarat || apiFieldErrors.purityKarat}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="mt-8 w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 font-bold rounded-xl hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.98]"
          >
            Continue to Loan Calculator →
          </button>
        </div>
      )}

      {/* ── Step 2: Loan Calculator & Scheme Selection ───────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Live Calculation Preview */}
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Loan Calculator</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Live preview — select a loan scheme below to see your eligible amount.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Net Gold Weight</p>
                <p className="text-xl font-bold text-white">
                  {parseFloat(form.netWeightGrams) || 0}g
                </p>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Purity</p>
                <p className="text-xl font-bold text-white">
                  {form.purityKarat}K ({((parseInt(form.purityKarat) / 24) * 100).toFixed(1)}%)
                </p>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Pure Gold Weight</p>
                <p className="text-xl font-bold text-amber-400">
                  {genericPreview ? `${genericPreview.pureGoldWeightGrams.toFixed(2)}g` : "—"}
                </p>
              </div>
              <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Gold Market Value</p>
                <p className="text-xl font-bold text-amber-400">
                  {genericPreview ? formatCurrency(genericPreview.goldMarketValue) : "—"}
                </p>
              </div>
            </div>

            {loanPreview && selectedScheme && (
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-400/10 border border-amber-500/30 rounded-xl p-5 mt-4">
                <p className="text-sm text-amber-300/80 mb-1">Maximum Eligible Loan Amount</p>
                <p className="text-3xl font-black text-amber-400">
                  {formatCurrency(loanPreview.maxEligibleLoanAmount)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  at {loanPreview.effectiveLtvPercent}% LTV via {selectedScheme.name}
                </p>
              </div>
            )}
          </div>

          {/* Scheme Selection Cards */}
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Select Loan Scheme</h3>
            {errors.selectedPlanId && (
              <p className="mb-3 text-sm text-red-400">{errors.selectedPlanId}</p>
            )}
            <div className="space-y-4">
              {schemes.map((scheme) => {
                const isSelected = form.selectedPlanId === scheme.id;
                const preview = genericPreview
                  ? calculateLoanPreview(
                      parseFloat(form.netWeightGrams),
                      parseInt(form.purityKarat),
                      scheme.maxLtvPercent
                    )
                  : null;

                return (
                  <button
                    key={scheme.id}
                    onClick={() => handleSelectScheme(scheme.id)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                        : "border-gray-700 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? "border-amber-500 bg-amber-500" : "border-gray-500"
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <h4 className="text-lg font-bold text-white">{scheme.name}</h4>
                        </div>
                        <p className="text-sm text-gray-400 ml-8 mb-3">{scheme.description}</p>
                        <div className="flex gap-6 ml-8">
                          <div>
                            <span className="text-xs text-gray-500 uppercase">Interest Rate</span>
                            <p className="text-sm font-semibold text-white">{scheme.baseInterestRate}% p.a.</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 uppercase">Max LTV</span>
                            <p className="text-sm font-semibold text-white">{scheme.maxLtvPercent}%</p>
                          </div>
                          {preview && (
                            <div>
                              <span className="text-xs text-gray-500 uppercase">Eligible Loan</span>
                              <p className="text-sm font-semibold text-amber-400">
                                {formatCurrency(preview.maxEligibleLoanAmount)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 bg-gray-800 text-gray-300 font-semibold rounded-xl border border-gray-700 hover:bg-gray-700 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleProceedToSubmit}
                disabled={!form.selectedPlanId}
                className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 font-bold rounded-xl hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Review & Submit →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ──────────────────────────────────────── */}
      {step === 3 && loanPreview && selectedScheme && (
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-1">Review Application</h2>
          <p className="text-gray-400 mb-6 text-sm">Verify your details before submitting.</p>

          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Customer</p>
                <p className="text-white font-medium">{form.customerName}</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Mobile</p>
                <p className="text-white font-medium">{form.mobileNumber}</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Gross Weight</p>
                <p className="text-white font-medium">{form.grossWeightGrams}g</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Net Weight</p>
                <p className="text-white font-medium">{form.netWeightGrams}g</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Purity</p>
                <p className="text-white font-medium">{form.purityKarat}K</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Pure Gold</p>
                <p className="text-amber-400 font-medium">{loanPreview.pureGoldWeightGrams.toFixed(2)}g</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-400/10 border border-amber-500/30 rounded-xl p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-amber-300/80">Selected Plan</span>
                <span className="text-white font-semibold">{selectedScheme.name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-amber-300/80">Interest Rate</span>
                <span className="text-white font-semibold">{selectedScheme.baseInterestRate}% p.a.</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-amber-300/80">LTV Applied</span>
                <span className="text-white font-semibold">{loanPreview.effectiveLtvPercent}%</span>
              </div>
              <hr className="border-amber-500/20 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-amber-300">Max Eligible Loan</span>
                <span className="text-2xl font-black text-amber-400">
                  {formatCurrency(loanPreview.maxEligibleLoanAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {submitError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm font-medium">{submitError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              className="flex-1 py-3.5 bg-gray-800 text-gray-300 font-semibold rounded-xl border border-gray-700 hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-green-400 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-green-300 transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                "Submit Application ✓"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Confirmation ─────────────────────────────────────────── */}
      {step === 4 && submitResult && (
        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-800 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
          <p className="text-gray-400 mb-6">Your gold loan application has been successfully recorded.</p>

          <div className="bg-gray-800/60 rounded-xl p-5 text-left mb-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Application ID</span>
              <span className="text-amber-400 font-mono text-sm font-bold">{submitResult.applicationId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Customer</span>
              <span className="text-white">{submitResult.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pure Gold Weight</span>
              <span className="text-white">{submitResult.pureGoldWeightGrams.toFixed(2)}g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Selected Plan</span>
              <span className="text-white">{submitResult.selectedPlan.name}</span>
            </div>
            <hr className="border-gray-700" />
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-semibold">Eligible Loan Amount</span>
              <span className="text-2xl font-black text-amber-400">
                {formatCurrency(submitResult.maxEligibleLoanAmount)}
              </span>
            </div>
          </div>

          <button
            onClick={handleNewApplication}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 font-bold rounded-xl hover:from-amber-400 hover:to-yellow-300 transition-all duration-200 shadow-lg shadow-amber-500/20"
          >
            Submit Another Application
          </button>
        </div>
      )}
    </div>
  );
}
