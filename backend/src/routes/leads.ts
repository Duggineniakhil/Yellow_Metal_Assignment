/**
 * leads.ts
 *
 * Route handlers for lead submission and retrieval endpoints.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  leadSubmissionSchema,
  formatZodErrors,
} from "../lib/validation";
import { calculateLoanEligibility } from "../lib/loanCalculator";

const router = Router();
const prisma = new PrismaClient();

// ─── Helper: Mask mobile number ──────────────────────────────────────────────

/**
 * Masks a 10-digit mobile number for privacy.
 * Format: first 4 digits + "XXXX" + last 2 digits
 * Example: "9876543210" → "9876XXXX10"
 */
function maskMobileNumber(mobile: string): string {
  if (mobile.length !== 10) return "XXXXXXXXXX";
  return `${mobile.slice(0, 4)}XXXX${mobile.slice(8)}`;
}

// ─── POST /api/v1/leads/submit ───────────────────────────────────────────────

/**
 * POST /api/v1/leads/submit
 *
 * Accepts a gold loan application, validates all inputs, checks for
 * duplicate submissions within 7 days, calculates loan eligibility,
 * and stores the lead.
 *
 * Response codes:
 *   201 — Lead created successfully
 *   400 — Validation error (field-level details provided)
 *   409 — Duplicate submission within 7 days
 *   500 — Internal server error
 */
router.post("/submit", async (req: Request, res: Response) => {
  try {
    // ── Step 1: Validate input using Zod schema ──────────────────────────
    const parseResult = leadSubmissionSchema.safeParse(req.body);

    if (!parseResult.success) {
      const { fieldErrors, messages } = formatZodErrors(parseResult.error);
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        fieldErrors,
        messages,
      });
      return;
    }

    const {
      customerName,
      mobileNumber,
      grossWeightGrams,
      netWeightGrams,
      purityKarat,
      selectedPlanId,
    } = parseResult.data;

    // ── Step 2: Verify selectedPlanId references an existing scheme ──────
    const selectedScheme = await prisma.loanScheme.findUnique({
      where: { id: selectedPlanId },
    });

    if (!selectedScheme) {
      res.status(400).json({
        success: false,
        error: "Validation failed.",
        fieldErrors: {
          selectedPlanId: `No loan scheme found with ID "${selectedPlanId}".`,
        },
        messages: [
          `selectedPlanId: No loan scheme found with ID "${selectedPlanId}".`,
        ],
      });
      return;
    }

    // ── Step 3: Deduplication check (same mobile within last 7 days) ────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const existingLead = await prisma.lead.findFirst({
      where: {
        mobileNumber,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingLead) {
      const submittedDate = existingLead.createdAt.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      res.status(409).json({
        success: false,
        error: `An application from this mobile number was already submitted on ${submittedDate}. Please wait 7 days before resubmitting.`,
        existingApplicationId: existingLead.id,
        existingSubmittedAt: existingLead.createdAt,
      });
      return;
    }

    // ── Step 4: Calculate loan eligibility ───────────────────────────────
    const calculation = calculateLoanEligibility({
      netWeightGrams,
      purityKarat,
      schemeMaxLtvPercent: selectedScheme.maxLtvPercent,
    });

    // ── Step 5: Insert the lead ──────────────────────────────────────────
    const lead = await prisma.lead.create({
      data: {
        customerName,
        mobileNumber,
        grossWeightGrams,
        netWeightGrams,
        purityKarat,
        selectedPlanId,
        pureGoldWeightGrams: calculation.pureGoldWeightGrams,
        maxEligibleLoanAmount: calculation.maxEligibleLoanAmount,
        status: "SUBMITTED",
      },
      include: {
        selectedPlan: true,
      },
    });

    // ── Step 6: Return success response ──────────────────────────────────
    res.status(201).json({
      success: true,
      data: {
        applicationId: lead.id,
        customerName: lead.customerName,
        mobileNumber: maskMobileNumber(lead.mobileNumber),
        grossWeightGrams: lead.grossWeightGrams,
        netWeightGrams: lead.netWeightGrams,
        purityKarat: lead.purityKarat,
        pureGoldWeightGrams: lead.pureGoldWeightGrams,
        maxEligibleLoanAmount: lead.maxEligibleLoanAmount,
        selectedPlan: {
          id: lead.selectedPlan.id,
          name: lead.selectedPlan.name,
          baseInterestRate: lead.selectedPlan.baseInterestRate,
          maxLtvPercent: lead.selectedPlan.maxLtvPercent,
        },
        status: lead.status,
        createdAt: lead.createdAt,
      },
    });
  } catch (error) {
    console.error("Error submitting lead:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while submitting the application.",
    });
  }
});

// ─── GET /api/v1/leads ───────────────────────────────────────────────────────

/**
 * GET /api/v1/leads
 *
 * Returns all leads, newest first.
 * Mobile numbers are MASKED for privacy — the raw number is never exposed.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        selectedPlan: {
          select: {
            id: true,
            name: true,
            baseInterestRate: true,
            maxLtvPercent: true,
          },
        },
      },
    });

    const maskedLeads = leads.map((lead) => ({
      id: lead.id,
      customerName: lead.customerName,
      maskedMobile: maskMobileNumber(lead.mobileNumber),
      grossWeightGrams: lead.grossWeightGrams,
      netWeightGrams: lead.netWeightGrams,
      purityKarat: lead.purityKarat,
      pureGoldWeightGrams: lead.pureGoldWeightGrams,
      maxEligibleLoanAmount: lead.maxEligibleLoanAmount,
      selectedPlan: lead.selectedPlan,
      status: lead.status,
      createdAt: lead.createdAt,
    }));

    res.json({
      success: true,
      data: maskedLeads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching leads.",
    });
  }
});

export default router;
