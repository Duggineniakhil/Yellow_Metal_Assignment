/**
 * loanSchemes.ts
 *
 * Route handler for loan scheme endpoints.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/loan-schemes
 *
 * Returns all seeded loan schemes, including baseInterestRate and maxLtvPercent.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const schemes = await prisma.loanScheme.findMany({
      orderBy: { createdAt: "asc" },
    });

    res.json({
      success: true,
      data: schemes,
    });
  } catch (error) {
    console.error("Error fetching loan schemes:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while fetching loan schemes.",
    });
  }
});

export default router;
