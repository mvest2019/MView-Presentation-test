import { z } from "zod";

/**
 * Shapes for the sign-in and sign-up forms.
 *
 * THE FIELDS ARE THE DESIGN'S — `marketing/src/routes/login.html` and
 * `signup.html` in the redesign build: one "Full name" box rather than a first
 * and last, a single mailing-address line, and a required consent checkbox.
 *
 * The design also draws an INVITE CODE. That one is deliberately not here — see
 * the note where it used to sit, below `mailingAddress`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EVERY MESSAGE BELOW IS THE LIVE SITE'S, COPIED VERBATIM (Ryan, 2026-08-19:
 * "take all msg from current website").
 *
 * Sources, both in `C:\Pravin\bold\Mview-Presentation-Next`:
 *   · `app/register/_components/RegisterForm.tsx` — `validateField`, plus the
 *     password ternary in the JSX at the field itself
 *   · `app/login/_components/LoginForm.tsx` — its own `newErrors` block
 *
 * Punctuation is copied as found, which means MOST HAVE NO FULL STOP and two do
 * ("…special character." and "…Privacy Policy."). That inconsistency is the live
 * site's; matching it is the point, so do not tidy it.
 *
 * TWO PLACES THE LIVE SITE COULD NOT BE COPIED MECHANICALLY:
 *
 *   1. EMAIL. Its two forms disagree — login says "Email is required" / "Please
 *      enter a valid email", register says "Email ID is required" / "Email must
 *      be a valid email address". One `email` schema is shared by both forms
 *      here, so one pair had to win: login's, because "Email ID" names a field
 *      this design does not have and reads oddly in en-GB/US copy. Swap the
 *      strings below if register's wording is wanted instead.
 *
 *   2. FULL NAME. The live form has First Name and Last Name; this one has a
 *      single box. Its messages follow the live pattern with the field renamed —
 *      "First Name is required" → "Full Name is required".
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * TWO CHECKS AGAIN, because the live site distinguishes "you left it blank" from
 * "that is not an address" and this had been collapsed to one combined sentence.
 * `.trim()` runs first, so "   " counts as blank rather than as malformed.
 */
const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Please enter a valid email");

/** Only shape-checked once something is typed — both are optional. */
const optionalText = z.string().trim();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
  // Unchecked by default, deliberately: the design notes this is for shared and
  // family devices ("v42 · Pragati").
  remember: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;

/*
 * The live site's `validRegex` from `validators/validators.ts`, character for
 * character: a lower, an upper, a digit and a symbol, in any order.
 *
 * Length is NOT in here. `validatePassword` tests `length < 8` separately and so
 * does the refine below, because the two are reported by one message and keeping
 * them apart makes that message's two halves visible.
 */
const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full Name is required")
    .regex(/^[A-Za-z\s'.-]+$/, "Full Name should contain only letters"),
  email,
  /*
   * ONE MESSAGE FOR THE WHOLE RULE (Ryan, 2026-08-19: "for password show proper
   * msg now showing one by one msg").
   *
   * This was five chained checks — `.min(8)` then a `.regex()` each for upper,
   * lower, digit and symbol — and with the resolver showing only the first error
   * per field that produced exactly the drip the note complains about: fix the
   * length and it asks for a capital, add one and it asks for a digit, and so on
   * through four more submissions.
   *
   * The live site does not do that. `validateField` there builds a comma-joined
   * list via `getPasswordErrors`, but THE JSX NEVER SHOWS IT — the field renders
   * a `validatePassword()` ternary that collapses every failure into one
   * sentence, so `errors.password` is only a truthiness flag. That single
   * sentence is what a visitor actually reads, and it is what is reproduced here:
   * a single `.refine` covering length AND the character classes together.
   *
   * KNOWN GAP IN THE COPY, INHERITED ON PURPOSE: the sentence lists uppercase,
   * digit and special character but NOT lowercase, while the regex requires one.
   * So "ABCDEFG1!" is rejected by a message that does not say why. That is the
   * live site's wording and it was asked for verbatim; adding "1 lowercase
   * letter," after "1 uppercase letter," is the whole fix if that is wanted.
   */
  password: z
    .string()
    .min(1, "Password is required")
    .refine(
      (v) => v.length >= 8 && PASSWORD_RULE.test(v),
      "Password must be at least 8 characters and include 1 uppercase letter, 1 digit, and 1 special character.",
    ),
  /*
   * TWO CHECKS, because one regex could not do both jobs honestly — and because
   * the live site only has copy for the second of them.
   *
   * CHARACTERS first: the placeholder is "(555) 555-0123", so brackets, spaces,
   * dashes and a leading + have to pass. The live site does not test this at all
   * — `isPhoneValid` strips every non-digit and counts what is left — which means
   * "abc(555) 555-0123" passes there. Kept, with its own wording, precisely
   * because there is no live message to copy for a case the live site ignores.
   *
   * DIGIT COUNT second, and this message IS the live site's ("Phone number must
   * be 10 digits"). Exactly ten, not a range: a US number with its area code, as
   * the placeholder says. The rule this replaced was `/^[-+().\s\d]{7,}$/` — a
   * floor and no ceiling, applied to the whole string rather than to the number —
   * which accepted "878979098897886764555555555" and posted 27 digits to the API.
   */
  phone: optionalText
    .refine(
      (v) => v === "" || /^[-+().\s\d]+$/.test(v),
      "A phone number can only contain digits, spaces and ( ) + - characters.",
    )
    .refine(
      (v) => v === "" || v.replace(/\D/g, "").length === 10,
      "Phone number must be 10 digits",
    ),
  mailingAddress: optionalText,
  /* `inviteCode` WAS HERE and is gone with its field — it read as a second
     verification code box, the live form has no such field, and nothing ever
     sent it. See the note in `register-form.tsx`. */
  terms: z.literal(true, {
    message: "You must agree to the Terms and Privacy Policy.",
  }),
});

export type RegisterValues = z.infer<typeof registerSchema>;

/** The six-digit email code. */
export const codeSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the six digits from the email.");
