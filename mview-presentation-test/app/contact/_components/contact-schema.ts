import { z } from "zod";

/**
 * One schema, used by the client form (react-hook-form resolver) and the API
 * route (server-side re-validation). Messages match the prototype's copy.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you."),
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
