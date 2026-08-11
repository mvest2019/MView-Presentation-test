import { z } from "zod";

/**
 * One schema, used by the client form (react-hook-form resolver) and the API
 * route (server-side re-validation).
 *
 * The name is two fields rather than one, matching the proposed layout — which
 * changes the POST body, so `app/api/contact/route.ts` and any backend mapping
 * move with it.
 */
export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Tell us your first name."),
  lastName: z.string().trim().min(1, "And your last name."),
  email: z
    .string()
    .trim()
    .min(1, "We need an email to reply to.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "That doesn't look like an email address."),
  // Optional — only shape-checked when something was typed.
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[-+().\s\d]{7,}$/.test(v),
      "That phone number looks off — digits only, please.",
    ),
  message: z.string().trim().min(1, "Tell us what you need — a sentence is plenty."),
});

export type ContactValues = z.infer<typeof contactSchema>;
