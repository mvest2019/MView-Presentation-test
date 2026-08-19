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
 * The PASSWORD RULES are the API's, ported from `isPasswordValid` in the live
 * repo: 8 characters with an upper, a lower, a digit and a symbol. The design's
 * placeholder says only "8+ characters" and is left exactly as written — but
 * validating on length alone would let the form submit and come back with an
 * opaque 400 from the endpoint, so the full rule is enforced and the specific
 * failure is shown against the field.
 */

/*
 * ONE CHECK, ONE MESSAGE (Ryan, 2026-08-19 — supplied the wording).
 *
 * This was a `.min(1)` for "Please enter your email address." and a `.regex()`
 * for "That doesn't look like an email address.". The supplied copy covers both
 * cases in a single sentence, and the regex alone already rejects an empty or
 * whitespace-only value — verified: "", "   " and "nope" all fail it — so the
 * length check would only ever repeat this message and is gone rather than
 * duplicated.
 */
const email = z
  .string()
  .trim()
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Valid email address is required.");

/** Only shape-checked once something is typed — all three are optional. */
const optionalText = z.string().trim();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required."),
  // Unchecked by default, deliberately: the design notes this is for shared and
  // family devices ("v42 · Pragati").
  remember: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .regex(/^[A-Za-z\s'.-]+$/, "A name should only contain letters."),
  email,
  /*
   * TWO LENGTH CHECKS, in this order, because the supplied copy distinguishes
   * the empty field from a short one: `.min(1)` catches "" and `.min(8)` catches
   * everything shorter than the rule. Zod collects issues in check order and the
   * resolver shows the first, so an empty box reads "Password is required." and
   * "abc" reads "Must be at least 8 characters." — verified against zod 4.4.3
   * rather than assumed.
   *
   * The four character-class messages below were NOT supplied and are unchanged.
   * They must stay: they are the API's own password rule (`isPasswordValid` in
   * the live repo), and dropping them would let the form submit and come back
   * with an opaque 400 from the endpoint.
   */
  password: z
    .string()
    .min(1, "Password is required.")
    .min(8, "Must be at least 8 characters.")
    .regex(/[A-Z]/, "Include at least one capital letter.")
    .regex(/[a-z]/, "Include at least one lower-case letter.")
    .regex(/\d/, "Include at least one number.")
    .regex(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      "Include at least one symbol, like ! or ?.",
    ),
  /*
   * TWO CHECKS, because one regex could not do both jobs honestly.
   *
   * The first is about CHARACTERS: the placeholder is "(555) 555-0123", so
   * brackets, spaces, dashes and a leading + have to pass.
   *
   * The second is about HOW MANY DIGITS, counted after those characters are
   * stripped — which is the check that was missing. The rule here was
   * `/^[-+().\s\d]{7,}$/`: a floor and NO CEILING, applied to the whole string
   * rather than to the number. It accepted "878979098897886764555555555" — 27
   * digits — and posted it to the API as a phone number.
   *
   * EXACTLY TEN, not a range. This is a US number with its area code and nothing
   * else; the placeholder says so ("(555) 555-0123") and the site is US-facing
   * throughout. A single length also gives a message worth reading — "Enter a
   * 10-digit phone number" tells someone what to do, where a range leaves them
   * counting. International numbers are not accepted here; if that changes, this
   * is the one place to widen.
   */
  phone: optionalText
    .refine(
      (v) => v === "" || /^[-+().\s\d]+$/.test(v),
      "A phone number can only contain digits, spaces and ( ) + - characters.",
    )
    .refine(
      (v) => v === "" || v.replace(/\D/g, "").length === 10,
      "Enter a 10-digit phone number, like (555) 555-0123.",
    ),
  mailingAddress: optionalText,
  /* `inviteCode` WAS HERE and is gone with its field — it read as a second
     verification code box, the live form has no such field, and nothing ever
     sent it. See the note in `register-form.tsx`. */
  terms: z.literal(true, { message: "Please accept the terms to continue." }),
});

export type RegisterValues = z.infer<typeof registerSchema>;

/** The six-digit email code. */
export const codeSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter the six digits from the email.");
