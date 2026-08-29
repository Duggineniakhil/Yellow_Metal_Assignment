# AI_LOG.md — AI Development Audit Trail

This document records AI tools used, key prompts, and one audited instance of flawed AI output during the development of the Yellow Metal Gold Loan Lead Intake Portal.

---

## AI Tools Used

- **Gemini (Antigravity IDE / Claude Opus 4.6 Thinking)** — Primary AI coding assistant used for the entire codebase: backend (Express + Prisma), frontend (React + Vite + TailwindCSS), validation logic, data model design, and documentation. All code was generated through an interactive pair-programming session with iterative review.

---

## Prompts Used

### Prompt 1 — Frontend Form State Management

> "Build a single-page flow with 3 steps plus an admin view, using clean, minimal Tailwind styling (no unstyled default browser inputs).
>
> **Step 1 — Customer & Gold Details Form**
> Fields: Customer Name (text), Mobile Number (tel, client-side format validation matching the backend regex), Gross Weight in grams (number), Net Weight in grams (number, client-side check that it's <= gross weight with an inline error), Purity (dropdown: 18K / 22K / 24K).
>
> **Step 2 — Dynamic Loan Calculator & Scheme Selection**
> As soon as Step 1 data is valid, show a live-updating summary: computed pure gold weight and computed max eligible loan amount (recalculate on every keystroke, mirroring backend logic on the client for instant feedback — but always treat the backend's response as source of truth on submit). Display the two loan schemes as selectable cards showing name, interest rate, and LTV cap; highlight the selected one.
>
> **Step 3 — Submit & Confirmation**
> 'Submit Application' button calls POST /api/v1/leads/submit.
> - On 201: show a confirmation screen with the generated Application ID, computed loan amount, and selected plan.
> - On 409: show a clear 'duplicate application' message with the conflict detail from the API.
> - On 400: show the specific validation error(s) inline near the relevant field.
> - Handle network/loading states (disable button while submitting, show a spinner)."

### Prompt 2 — Backend Validation Rules

> "Validation (return 400 Bad Request with a clear field-level error message on any failure):
> - All fields required and correctly typed.
> - mobileNumber must match a valid 10-digit Indian mobile format: /^[6-9]\d{9}$/ (starts with 6-9, exactly 10 digits). Do NOT use a naive /^\d{10}$/ — that's a known flawed pattern since it would accept numbers starting with 0-5.
> - purityKarat must be one of [18, 22, 24].
> - grossWeightGrams and netWeightGrams must be positive numbers.
> - netWeightGrams must be <= grossWeightGrams (strictly enforce; reject equal-is-fine but net > gross is invalid).
> - selectedPlanId must reference an existing LoanScheme."

---

## Flawed AI Output & Fix

### Issue: TypeScript Discriminated Union Narrowing Failure

**What happened:** During the implementation of the `LeadForm.tsx` component, the AI generated the following error-handling block for the API response:

```typescript
const result = await submitLead(payload);

if (result.success) {
  setSubmitResult(result.data);
  setStep(4);
} else if (!result.success) {
  // TS Error: Property 'status' does not exist on type...
  if (result.status === 409) { 
    setSubmitError(result.error.error);
  }
}
```

**The flaw:** The AI assumed that `else if (!result.success)` would perfectly narrow the discriminated union (`{ success: true; ... } | { success: false; status: number; error: ApiError }`). However, strict TypeScript control-flow analysis failed to recognize `!result.success` as a strict type guard for the false branch, throwing compilation errors about missing `status` and `error` properties.

**The audit & fix:** I audited the IDE logs and noticed the compilation failure. To fix this, I manually replaced the flawed narrowing logic with an exact literal check (`result.success === false`), which satisfied TypeScript's control flow analysis:

```typescript
// ✅ Correctly narrowed for strict TypeScript environments
if (result.success) {
  setSubmitResult(result.data);
  setStep(4);
} else if (result.success === false) {
  if (result.status === 409) { 
    setSubmitError(result.error.error);
  }
}
```

This manual intervention ensured the frontend compiled cleanly and the correct API error states were rendered to the user.
