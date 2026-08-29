/**
 * validation.ts
 *
 * Zod schemas for validating all API inputs.
 * Each validation rule returns a specific, human-readable error message.
 */

import { z } from "zod";

/**
 * Validation schema for lead submission payload.
 *
 * Mobile number regex: /^[6-9]\d{9}$/
 * - Must start with 6, 7, 8, or 9 (valid Indian mobile prefixes)
 * - Followed by exactly 9 more digits
 * - Total: exactly 10 digits
 *
 * NOTE: We do NOT use the naive /^\d{10}$/ pattern because it would
 * incorrectly accept numbers starting with 0-5, which are not valid
 * Indian mobile numbers (those prefixes are reserved for landlines,
 * special services, etc.)
 */
export const leadSubmissionSchema = z
  .object({
    customerName: z
      .string({
        required_error: "Customer name is required.",
        invalid_type_error: "Customer name must be a string.",
      })
      .min(1, "Customer name cannot be empty.")
      .max(200, "Customer name must be at most 200 characters."),

    mobileNumber: z
      .string({
        required_error: "Mobile number is required.",
        invalid_type_error: "Mobile number must be a string.",
      })
      .regex(
        /^[6-9]\d{9}$/,
        "Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
      ),

    grossWeightGrams: z
      .number({
        required_error: "Gross weight in grams is required.",
        invalid_type_error: "Gross weight must be a number.",
      })
      .positive("Gross weight must be a positive number."),

    netWeightGrams: z
      .number({
        required_error: "Net weight in grams is required.",
        invalid_type_error: "Net weight must be a number.",
      })
      .positive("Net weight must be a positive number."),

    purityKarat: z
      .number({
        required_error: "Purity (karat) is required.",
        invalid_type_error: "Purity must be a number.",
      })
      .refine(
        (val) => [18, 22, 24].includes(val),
        "Purity must be one of: 18, 22, or 24 karats."
      ),

    selectedPlanId: z
      .string({
        required_error: "Selected plan ID is required.",
        invalid_type_error: "Selected plan ID must be a string.",
      })
      .min(1, "Selected plan ID cannot be empty."),
  })
  .refine((data) => data.netWeightGrams <= data.grossWeightGrams, {
    message: "Net weight cannot exceed gross weight.",
    path: ["netWeightGrams"],
  });

/**
 * Type inferred from the Zod schema — use this as the validated payload type.
 */
export type LeadSubmissionInput = z.infer<typeof leadSubmissionSchema>;

/**
 * Formats Zod validation errors into a clean, field-level error map.
 *
 * @returns An object mapping field names to their error messages,
 *          plus a flat array of all error messages.
 */
export function formatZodErrors(error: z.ZodError): {
  fieldErrors: Record<string, string>;
  messages: string[];
} {
  const fieldErrors: Record<string, string> = {};
  const messages: string[] = [];

  for (const issue of error.issues) {
    const field = issue.path.join(".");
    const message = issue.message;
    fieldErrors[field] = message;
    messages.push(`${field}: ${message}`);
  }

  return { fieldErrors, messages };
}
