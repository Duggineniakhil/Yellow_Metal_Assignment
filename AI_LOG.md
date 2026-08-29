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

### Issue: Mobile Number Regex — The `/^\d{10}$/` Anti-Pattern

**What happened:** The assignment specification explicitly warned against using the naive regex `/^\d{10}$/` for Indian mobile number validation. This pattern is flawed because it accepts numbers starting with digits 0–5, which are **not valid Indian mobile prefixes** (those ranges are reserved for landlines, toll-free numbers, and special services).

**The audit:** During development, I verified that the generated backend validation (`validation.ts`) and frontend validation (`LeadForm.tsx`) both used the correct regex:

```typescript
// ✅ Correct — only accepts numbers starting with 6, 7, 8, or 9
/^[6-9]\d{9}$/
```

If the naive pattern had been used instead:

```typescript
// ❌ Flawed — would accept 0123456789, 5555555555, etc.
/^\d{10}$/
```

...the system would have accepted invalid mobile numbers like `0123456789` or `5000000000`, which are not reachable Indian mobile numbers. This would lead to failed SMS/OTP delivery and polluted lead data.

**The fix applied:** Both the Zod schema in `backend/src/lib/validation.ts` (line ~42) and the client-side `MOBILE_REGEX` constant in `frontend/src/components/LeadForm.tsx` (line ~17) were written from the start with the correct `/^[6-9]\d{9}$/` pattern. The validation error message explicitly states the requirement:

```
"Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
```

This was treated as a deliberate audit checkpoint — the kind of "obvious-looking but subtly wrong" pattern that AI code generators are prone to producing if not specifically instructed otherwise.

**Verification:** The backend test can be verified by sending a POST to `/api/v1/leads/submit` with `mobileNumber: "0123456789"` — it correctly returns `400 Bad Request` with the field-level error.
