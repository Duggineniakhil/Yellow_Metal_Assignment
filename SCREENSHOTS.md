# Application Screenshots

A visual walkthrough of the Yellow Metal Gold Loan Lead Intake Portal.

## Screenshots

### Step 1 — Customer & Gold Details
![Step 1](screenshots/step1-details.png)
*Live-updating estimate panel recalculates pure gold weight and eligible loan amount as the user types.*

### Step 2 — Choose a Plan
![Step 2](screenshots/step2-plans.png)
*Bullet Repayment (9.5% / 75% LTV) vs Monthly EMI (11% / 65% LTV) — selectable scheme cards.*

### Step 3 — Review & Submit
![Step 3](screenshots/step3-review.png)

### Confirmation
![Confirmation](screenshots/confirmation.png)
*Generated Application ID, final eligible loan amount, and selected plan.*

### Partner Summary Dashboard
![Admin Dashboard](screenshots/partner-dashboard.png)
*Mobile numbers masked (e.g. `9967XXXX32`), sorted newest first.*

### Validation in Action
![Validation Error](screenshots/validation-error.png)
*Net weight exceeding gross weight is rejected inline before submission.*

## API Duplicate Lead Rejection (409 Conflict)

Below is a raw curl transcript showing the same 7-day deduplication rule being enforced at the API level when a user tries to submit a lead for the same mobile number within the lockout period:

```bash
curl -X POST localhost:3000/api/v1/leads/submit \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9967874532", "customerName":"Rahul", "grossWeightGrams":50, "netWeightGrams":45, "purityKarat":22, "selectedPlanId":"PLAN_BULLET_01"}'

# → 409 Conflict
# {
#   "success": false,
#   "error": "An application from this mobile number was already submitted on August 29, 2026. Please wait 7 days before resubmitting.",
#   "existingApplicationId": "4880bb6e-...",
#   "existingSubmittedAt": "2026-08-29T10:00:00.000Z"
# }
```
