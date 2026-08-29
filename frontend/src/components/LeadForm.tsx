import { useState, useEffect, useMemo } from "react";
import {
  type LoanScheme,
  type LeadResponse,
  fetchLoanSchemes,
  submitLead,
} from "../lib/api";
import { calculateLoanPreview } from "../lib/loanCalculator";

// ─── Validation Helpers ──────────────────────────────────────────────────────

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

  useEffect(() => {
    fetchLoanSchemes()
      .then(setSchemes)
      .catch((err) => console.error("Failed to load schemes:", err));
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateStep1(): FormErrors {
    const errs: FormErrors = {};

    if (!form.customerName.trim()) errs.customerName = "Full name is required.";

    if (!form.mobileNumber.trim()) {
      errs.mobileNumber = "Mobile number is required.";
    } else if (!MOBILE_REGEX.test(form.mobileNumber)) {
      errs.mobileNumber = "Enter a valid 10-digit Indian mobile number.";
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

    if (!form.purityKarat) errs.purityKarat = "Please select gold purity.";

    return errs;
  }

  // ── Live Calculator Previews ───────────────────────────────────────────────

  const selectedScheme = schemes.find((s) => s.id === form.selectedPlanId);

  const genericPreview = useMemo(() => {
    const net = parseFloat(form.netWeightGrams);
    const karat = parseInt(form.purityKarat);
    if (!net || !karat || net <= 0 || ![18, 22, 24].includes(karat)) return null;
    return calculateLoanPreview(net, karat, 75);
  }, [form.netWeightGrams, form.purityKarat]);

  const activePreview = useMemo(() => {
    if (step > 1 && selectedScheme) {
      const net = parseFloat(form.netWeightGrams);
      const karat = parseInt(form.purityKarat);
      if (!net || !karat || net <= 0 || ![18, 22, 24].includes(karat)) return null;
      return calculateLoanPreview(net, karat, selectedScheme.maxLtvPercent);
    }
    return genericPreview;
  }, [step, selectedScheme, genericPreview, form.netWeightGrams, form.purityKarat]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
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
    if (Object.keys(errs).length === 0) setStep(2);
  }

  function handleProceedToSubmit() {
    if (!form.selectedPlanId) {
      setErrors((prev) => ({ ...prev, selectedPlanId: "Please select a loan plan." }));
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
        setStep(4);
      } else if (result.success === false) {
        if (result.status === 409) {
          setSubmitError(result.error.error);
        } else if (result.status === 400) {
          setSubmitError(result.error.error);
          if (result.error.fieldErrors) {
            setApiFieldErrors(result.error.fieldErrors);
            const step1Fields = ["customerName", "mobileNumber", "grossWeightGrams", "netWeightGrams", "purityKarat"];
            if (Object.keys(result.error.fieldErrors).some((f) => step1Fields.includes(f))) setStep(1);
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

  const formatCurrencyWithoutSymbol = (val: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(val);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  const getError = (field: keyof FormData) => errors[field] || apiFieldErrors[field];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* ── Step Indicator (Horizontal Line) ── */}
      {step < 4 && (
        <div className="flex items-center justify-center mb-16 overflow-x-auto pb-4 max-w-2xl mx-auto">
          {[
            { n: 1, label: "Your details" },
            { n: 2, label: "Choose a plan" },
            { n: 3, label: "Confirmation" },
          ].map(({ n, label }, idx) => {
            const isActive = step === n;
            const isPast = step > n;
            return (
              <div key={n} className="flex items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 flex items-center justify-center text-xs font-bold transition-all border ${
                      isActive || isPast
                        ? "bg-[#cba344] text-white border-[#cba344]"
                        : "bg-transparent text-gray-400 border-gray-300"
                    }`}
                  >
                    0{n}
                  </div>
                  <span
                    className={`text-[13px] tracking-wide ${
                      isActive || isPast ? "text-gray-800 font-bold" : "text-gray-400 font-medium"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < 2 && <div className="w-16 h-[1px] bg-gray-200 mx-4"></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 2-Column Layout ── */}
      <div className="flex flex-col lg:flex-row gap-16 items-start">
        
        {/* Left Column: Form Steps */}
        <div className="flex-1 w-full min-w-0">
          
          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="animate-fade-in">
              <p className="text-[#cba344] text-[10px] font-bold uppercase tracking-widest mb-3">
                STEP 01 / YOUR DETAILS
              </p>
              <h2 className="font-serif text-5xl font-semibold text-[#1a1a1a] tracking-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                Begin with your gold.
              </h2>
              <p className="text-gray-500 mb-10 text-[15px] leading-relaxed max-w-md">
                Tell us a little about yourself and the gold you'd like to pledge. It takes less than two minutes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="customerName" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    FULL NAME
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    value={form.customerName}
                    onChange={(e) => handleChange("customerName", e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    className={`w-full border border-gray-200 p-3.5 rounded-sm text-sm outline-none focus:border-[#cba344] focus:ring-1 focus:ring-[#cba344] transition-all bg-white ${
                      getError("customerName") ? "border-red-500" : ""
                    }`}
                  />
                  {getError("customerName") && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">{getError("customerName")}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="mobileNumber" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    MOBILE NUMBER
                  </label>
                  <input
                    id="mobileNumber"
                    type="tel"
                    maxLength={10}
                    value={form.mobileNumber}
                    onChange={(e) => handleChange("mobileNumber", e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    className={`w-full border border-gray-200 p-3.5 rounded-sm text-sm outline-none focus:border-[#cba344] focus:ring-1 focus:ring-[#cba344] transition-all bg-white ${
                      getError("mobileNumber") ? "border-red-500" : ""
                    }`}
                  />
                  {getError("mobileNumber") && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">{getError("mobileNumber")}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 my-8"></div>
              
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">GOLD DETAILS</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="grossWeight" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    GROSS WEIGHT (GRAMS)
                  </label>
                  <input
                    id="grossWeight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.grossWeightGrams}
                    onChange={(e) => handleChange("grossWeightGrams", e.target.value)}
                    placeholder="0.00"
                    className={`w-full border border-gray-200 p-3.5 rounded-sm text-sm outline-none focus:border-[#cba344] focus:ring-1 focus:ring-[#cba344] transition-all bg-white ${
                      getError("grossWeightGrams") ? "border-red-500" : ""
                    }`}
                  />
                  {getError("grossWeightGrams") && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">{getError("grossWeightGrams")}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="netWeight" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    NET WEIGHT (GRAMS)
                  </label>
                  <input
                    id="netWeight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.netWeightGrams}
                    onChange={(e) => handleChange("netWeightGrams", e.target.value)}
                    placeholder="0.00"
                    className={`w-full border border-gray-200 p-3.5 rounded-sm text-sm outline-none focus:border-[#cba344] focus:ring-1 focus:ring-[#cba344] transition-all bg-white ${
                      getError("netWeightGrams") ? "border-red-500" : ""
                    }`}
                  />
                  {getError("netWeightGrams") && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">{getError("netWeightGrams")}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="purityKarat" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  PURITY
                </label>
                <select
                  id="purityKarat"
                  value={form.purityKarat}
                  onChange={(e) => handleChange("purityKarat", e.target.value)}
                  className={`w-full border border-gray-200 p-3.5 rounded-sm text-sm outline-none focus:border-[#cba344] focus:ring-1 focus:ring-[#cba344] transition-all bg-white appearance-none ${
                    getError("purityKarat") ? "border-red-500" : ""
                  }`}
                >
                  <option value="" disabled>Select purity</option>
                  <option value="24">24 Karat</option>
                  <option value="22">22 Karat</option>
                  <option value="18">18 Karat</option>
                </select>
                {getError("purityKarat") && (
                  <p className="mt-1.5 text-xs text-red-500 font-medium">{getError("purityKarat")}</p>
                )}
              </div>

              <button
                onClick={handleNext}
                className="mt-10 bg-[#cba344] text-white font-bold py-3.5 px-8 rounded-sm hover:bg-[#b58f38] transition-colors flex items-center gap-2"
              >
                Continue to plans →
              </button>
            </div>
          )}

          {/* STEP 2: Choose Plan */}
          {step === 2 && (
            <div className="animate-fade-in">
              <p className="text-[#cba344] text-[10px] font-bold uppercase tracking-widest mb-3">
                STEP 02 / CHOOSE A PLAN
              </p>
              <h2 className="font-serif text-5xl font-semibold text-[#1a1a1a] tracking-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                Select your scheme.
              </h2>
              <p className="text-gray-500 mb-10 text-[15px] leading-relaxed max-w-md">
                Choose a repayment plan that fits your financial needs perfectly.
              </p>

              {getError("selectedPlanId") && (
                <p className="mb-4 text-xs text-red-500 font-medium">{getError("selectedPlanId")}</p>
              )}

              <div className="space-y-4">
                {schemes.map((scheme) => {
                  const isSelected = form.selectedPlanId === scheme.id;
                  return (
                    <button
                      key={scheme.id}
                      onClick={() => handleChange("selectedPlanId", scheme.id)}
                      className={`w-full text-left p-6 rounded-sm border transition-all duration-200 flex items-start gap-4 ${
                        isSelected
                          ? "border-[#cba344] bg-[#fbf8ef]"
                          : "border-gray-200 bg-white hover:border-[#cba344]/50"
                      }`}
                    >
                      {/* Checkbox / Radio indicator */}
                      <div className={`mt-0.5 w-5 h-5 rounded-sm border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-[#cba344] border-[#cba344]" : "border-gray-300"
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900">{scheme.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{scheme.description}</p>
                        
                        <div className="flex gap-8 mt-4">
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Interest</span>
                            <span className="text-sm font-semibold text-gray-800">{scheme.baseInterestRate}% p.a.</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Max LTV</span>
                            <span className="text-sm font-semibold text-gray-800">{scheme.maxLtvPercent}%</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setStep(1)}
                  className="py-3.5 px-8 bg-transparent text-gray-600 border border-gray-300 font-bold rounded-sm hover:bg-white transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleProceedToSubmit}
                  disabled={!form.selectedPlanId}
                  className="bg-[#cba344] text-white font-bold py-3.5 px-8 rounded-sm hover:bg-[#b58f38] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review Application →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Submit */}
          {step === 3 && activePreview && selectedScheme && (
            <div className="animate-fade-in">
              <p className="text-[#cba344] text-[10px] font-bold uppercase tracking-widest mb-3">
                STEP 03 / CONFIRMATION
              </p>
              <h2 className="font-serif text-5xl font-semibold text-[#1a1a1a] tracking-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                Review details.
              </h2>
              <p className="text-gray-500 mb-10 text-[15px] leading-relaxed max-w-md">
                Please verify your details below before final submission.
              </p>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-10 border border-gray-200 bg-white p-6 rounded-sm">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Customer</p>
                  <p className="text-sm font-medium text-gray-900">{form.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Mobile</p>
                  <p className="text-sm font-medium text-gray-900">+91 {form.mobileNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Gold Details</p>
                  <p className="text-sm font-medium text-gray-900">{form.grossWeightGrams}g Gross · {form.purityKarat}K</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Selected Plan</p>
                  <p className="text-sm font-medium text-gray-900">{selectedScheme.name}</p>
                </div>
              </div>

              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm">
                  <p className="text-red-600 text-sm font-medium">{submitError}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="py-3.5 px-8 bg-transparent text-gray-600 border border-gray-300 font-bold rounded-sm hover:bg-white transition-colors disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-[#cba344] text-white font-bold py-3.5 px-8 rounded-sm hover:bg-[#b58f38] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Application ✓"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && submitResult && (
            <div className="animate-fade-in text-center py-10">
              <div className="w-20 h-20 bg-[#cba344]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#cba344]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-serif text-5xl font-semibold text-[#1a1a1a] tracking-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                Application Received.
              </h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                Your loan application has been successfully recorded. An executive will contact you shortly to arrange a physical valuation.
              </p>

              <div className="bg-white border border-gray-200 p-6 rounded-sm text-left max-w-sm mx-auto mb-10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">App ID</span>
                  <span className="text-sm font-mono font-bold text-gray-800">{submitResult.applicationId.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Eligible Loan</span>
                  <span className="text-lg font-black text-[#cba344]">{formatCurrency(submitResult.maxEligibleLoanAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Plan</span>
                  <span className="text-sm font-medium text-gray-800">{submitResult.selectedPlan.name}</span>
                </div>
              </div>

              <button
                onClick={handleNewApplication}
                className="bg-gray-900 text-white font-bold py-3.5 px-8 rounded-sm hover:bg-black transition-colors"
              >
                Start New Application
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Live Estimate Sidebar (hidden on step 4) */}
        {step < 4 && (
          <div className="w-full lg:w-[380px] shrink-0 sticky top-24">
            <div className="bg-[#181c1a] text-white p-8 rounded-sm relative overflow-hidden shadow-2xl">
              
              {/* Decorative arc in top right corner */}
              <div className="absolute -top-16 -right-16 w-40 h-40 border border-[#cba344]/30 rounded-full"></div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <p className="text-[#cba344] text-[10px] font-bold uppercase tracking-widest">
                  LIVE ESTIMATE
                </p>
                <span className="text-[#cba344] text-lg leading-none">✧</span>
              </div>
              
              <div className="mb-10 relative z-10">
                <p className="text-[42px] font-serif font-medium text-white flex items-center leading-none tracking-tight mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  <span className="text-[#cba344] text-3xl mr-1 font-sans">₹</span>
                  {activePreview ? formatCurrencyWithoutSymbol(activePreview.maxEligibleLoanAmount) : '0'}
                </p>
                <p className="text-[11px] text-gray-400 font-medium">Maximum eligible loan amount</p>
              </div>
              
              <div className="border-t border-gray-700/50 my-6 relative z-10"></div>
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Pure gold weight</span>
                  <span className="font-bold text-white tracking-wide">
                    {activePreview ? activePreview.pureGoldWeightGrams.toFixed(2) : '0.00'} g
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Gold rate</span>
                  <span className="font-bold text-white tracking-wide">₹6,200 / g</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">LTV cap</span>
                  <span className="font-bold text-white tracking-wide">
                    {activePreview ? activePreview.effectiveLtvPercent : '75'}%
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-700/50 my-6 relative z-10"></div>
              
              <div className="flex items-start gap-2.5 relative z-10">
                <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] text-gray-400 leading-relaxed font-medium">
                  Final amount confirmed after verification
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
