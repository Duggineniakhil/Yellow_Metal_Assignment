/**
 * api.ts
 *
 * API client functions for communicating with the Yellow Metal backend.
 * Uses relative URLs — Vite proxy forwards /api/* to the backend.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoanScheme {
  id: string;
  name: string;
  description: string;
  baseInterestRate: number;
  maxLtvPercent: number;
  createdAt: string;
}

export interface LeadSubmissionPayload {
  customerName: string;
  mobileNumber: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  purityKarat: number;
  selectedPlanId: string;
}

export interface LeadResponse {
  applicationId: string;
  customerName: string;
  mobileNumber: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  purityKarat: number;
  pureGoldWeightGrams: number;
  maxEligibleLoanAmount: number;
  selectedPlan: {
    id: string;
    name: string;
    baseInterestRate: number;
    maxLtvPercent: number;
  };
  status: string;
  createdAt: string;
}

export interface LeadListItem {
  id: string;
  customerName: string;
  maskedMobile: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  purityKarat: number;
  pureGoldWeightGrams: number;
  maxEligibleLoanAmount: number;
  selectedPlan: {
    id: string;
    name: string;
    baseInterestRate: number;
    maxLtvPercent: number;
  };
  status: string;
  createdAt: string;
}

export interface ApiError {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
  messages?: string[];
  existingApplicationId?: string;
  existingSubmittedAt?: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────

const API_BASE = "/api/v1";

export async function fetchLoanSchemes(): Promise<LoanScheme[]> {
  const res = await fetch(`${API_BASE}/loan-schemes`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch loan schemes");
  return data.data;
}

export async function submitLead(
  payload: LeadSubmissionPayload
): Promise<{ success: true; data: LeadResponse } | { success: false; status: number; error: ApiError }> {
  const res = await fetch(`${API_BASE}/leads/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (res.ok) {
    return { success: true, data: data.data };
  }

  return { success: false, status: res.status, error: data };
}

export async function fetchLeads(): Promise<LeadListItem[]> {
  const res = await fetch(`${API_BASE}/leads`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch leads");
  return data.data;
}
