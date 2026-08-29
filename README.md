# 🪙 Yellow Metal — Gold Loan Lead Intake Portal

A full-stack web application for **Yellow Metal**, an RBI-licensed NBFC, enabling partners and prospective borrowers to submit gold loan applications with instant eligibility calculations.

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| **Backend** | Node.js + Express (TypeScript)      |
| **Database**| PostgreSQL + Prisma ORM             |
| **Frontend**| React (Vite) + TypeScript + TailwindCSS |
| **Validation** | Zod (server-side) + client-side matching |

## Features

- **Multi-step application form** — Customer details → Loan calculator → Submit
- **Real-time loan calculator** — Instant pure gold weight and loan eligibility preview
- **Two loan schemes** — Bullet Repayment (9.5%) and Monthly EMI (11%)
- **Strict validation** — Indian mobile number format, weight constraints, karat purity
- **7-day deduplication** — Prevents duplicate submissions from the same mobile number
- **Admin dashboard** — View all applications with masked mobile numbers, sortable by date
- **RBI-compliant** — LTV capped at 75% per regulatory guidelines

## Project Structure

```
Yellow_metal/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Data model (LoanScheme + Lead)
│   │   └── seed.ts            # Seed two loan schemes
│   ├── src/
│   │   ├── lib/
│   │   │   ├── loanCalculator.ts       # Pure calculation logic (unit-testable)
│   │   │   ├── loanCalculator.test.ts  # Calculator tests
│   │   │   └── validation.ts           # Zod validation schemas
│   │   ├── routes/
│   │   │   ├── loanSchemes.ts  # GET /api/v1/loan-schemes
│   │   │   └── leads.ts       # POST /api/v1/leads/submit, GET /api/v1/leads
│   │   └── index.ts           # Express app entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LeadForm.tsx    # Multi-step form (Steps 1-4)
│   │   │   └── AdminView.tsx   # Partner summary table
│   │   ├── lib/
│   │   │   ├── api.ts          # API client functions
│   │   │   └── loanCalculator.ts # Client-side calculation mirror
│   │   ├── App.tsx             # Root component with tab navigation
│   │   ├── main.tsx
│   │   └── index.css           # TailwindCSS + custom styles
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── .gitignore
├── AI_LOG.md
└── README.md
```

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** running locally (or a cloud-hosted instance)
- **npm** (comes with Node.js)

### 1. Clone & Install

```bash
# Clone the repository
git clone <repo-url>
cd Yellow_metal

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# In the backend folder, create a .env file from the template:
cd backend
cp .env.example .env

# Edit .env with your PostgreSQL connection string:
# DATABASE_URL="postgresql://user:password@localhost:5432/yellow_metal?schema=public"
# PORT=3000
```

### 3. Initialize the Database

```bash
cd backend

# Run Prisma migrations (creates the tables)
npx prisma migrate dev --name init

# Seed the database with the two loan schemes
npx prisma db seed
```

### 4. Run the Application

```bash
# Terminal 1 — Start the backend API server
cd backend
npm run dev
# → Server runs on http://localhost:3000

# Terminal 2 — Start the frontend dev server
cd frontend
npm run dev
# → Frontend runs on http://localhost:5173
```

The frontend's Vite dev server proxies `/api/*` requests to the backend automatically.

### 5. Run Tests

```bash
cd backend
npx tsx src/lib/loanCalculator.test.ts
```

## API Reference

### `GET /api/v1/loan-schemes`
Returns all available loan schemes with interest rates and LTV caps.

### `POST /api/v1/leads/submit`
Submits a gold loan application. Validates all inputs, checks for 7-day deduplication, calculates loan eligibility, and returns the generated Application ID.

**Payload:**
```json
{
  "customerName": "Rahul Sharma",
  "mobileNumber": "9876543210",
  "grossWeightGrams": 50,
  "netWeightGrams": 45,
  "purityKarat": 22,
  "selectedPlanId": "PLAN_BULLET_01"
}
```

**Responses:**
- `201 Created` — Application submitted successfully
- `400 Bad Request` — Validation error with field-level details
- `409 Conflict` — Duplicate submission within 7 days

### `GET /api/v1/leads`
Returns all leads (newest first) with masked mobile numbers.

## Environment Variables

| Variable       | Description                        | Example                                              |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string       | `postgresql://user:pass@localhost:5432/yellow_metal`  |
| `PORT`         | Backend server port (default 3000) | `3000`                                               |

## License

Internal — Yellow Metal Finance Ltd.
