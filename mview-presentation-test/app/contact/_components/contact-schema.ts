import { z } from "zod";

/**
 * Shape of the contact form, and of the request body sent to the contact API.
 *
 * Field names match the backend contract exactly — `comment`, not `message` —
 * so the validated object can be posted as-is with no mapping step in between.
 * Renaming a field here changes the request body.
 */
export const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Tell us your first name."),
  lastName: z.string().trim().min(1, "Tell us your last name."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "That doesn't look like an email address."),
  // Optional — only shape-checked when something was typed.
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[-+().\s\d]{7,}$/.test(v),
      "That phone number looks off — digits only, please.",
    ),
  comment: z.string().trim().min(1, "Tell us what you need — a sentence is plenty."),
});

export type ContactValues = z.infer<typeof contactSchema>;
