/**
 * index.ts
 *
 * Express application entry point for Yellow Metal Gold Loan API.
 */

import express from "express";
import cors from "cors";
import loanSchemesRouter from "./routes/loanSchemes";
import leadsRouter from "./routes/leads";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

// Enable CORS for frontend development (Vite runs on port 5173)
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Parse JSON request bodies
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api/v1/loan-schemes", loanSchemesRouter);
app.use("/api/v1/leads", leadsRouter);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Yellow Metal Gold Loan API",
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// Catches any unhandled errors from async route handlers. Express requires
// the 4-argument signature (err, req, res, next) to recognize this as an
// error-handling middleware — do NOT remove the `_next` parameter.

import { Request as ExpReq, Response as ExpRes, NextFunction } from "express";

app.use((err: Error, _req: ExpReq, res: ExpRes, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "An unexpected internal server error occurred.",
  });
});

// Catch unhandled promise rejections globally
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🪙  Yellow Metal Gold Loan API`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Loan schemes: http://localhost:${PORT}/api/v1/loan-schemes`);
  console.log(`   Submit lead:  POST http://localhost:${PORT}/api/v1/leads/submit`);
  console.log(`   List leads:   http://localhost:${PORT}/api/v1/leads\n`);
});

export default app;
