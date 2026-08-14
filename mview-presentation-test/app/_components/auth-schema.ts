import { z } from "zod";

/**
 * Shapes for the sign-in and sign-up forms.
 *
 * THE FIELDS ARE THE DESIGN'S — `marketing/src/routes/login.html` and
 * `signup.html` in the redesign build: one "Full name" box rather than a first
 * and last, a single mailing-address line, an invite code, and a required
 * consent checkbox. Nothing is added to or removed from that set here.
 *
 * The PASSWORD RULES are the API's, ported from `isPasswordValid` in the live
 * repo: 8 characters with an upper, a lower, a digit and a symbol. The design's
 * placeholder says only "8+ characters" and is left exactly as written — but
 * validating on length alone would let the form submit and come back with an
 * opaque 400 from the endpoint, so the full rule is enforced and the specific
 * failure is shown against the field.
 */

const email = z
  .string()
  .trim()
  .min(1, "Please enter your email address.")
  .regex(
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
    "That doesn't look like an email address.",
  );

/** Only shape-checked once something is typed — all three are optional. */
const optionalText = z.string().trim();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Please enter your password."),
  // Unchecked by default, deliberately: the design notes this is for shared and
  // family devices ("v42 · Pragati").
  remember: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .regex(/^[A-Za-z\s'.-]+$/, "A name should only contain letters."),
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Z]/, "Include at least one capital letter.")
    .regex(/[a-z]/, "Include at least one lower-case letter.")
    .regex(/\d/, "Include at least one number.")
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      "Include at least one symbol, like ! or ?.",
    ),
  phone: optionalText.refine(
    (v) => v === "" || /^[-+().\s\d]{7,}$/.test(v),
    "That phone number looks off — digits only, please.",
  ),
  mailingAddress: optionalText,
  inviteCode: optionalText,
  terms: z.literal(true, { message: "Please accept the terms to continue." }),
});

export type RegisterValues = z.infer<typeof registerSchema>;

/** The six-digit email code. */
export const codeSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the six digits from the email.");
