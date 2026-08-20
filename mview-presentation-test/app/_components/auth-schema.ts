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
/*
 * TRIMMED **AND** LOWER-CASED (Ryan, 2026-08-19: "removes extra spaces from the
 * email but does not convert uppercase letters to lowercase").
 *
 * `.trim()` was here on its own, so "  Trim.Chouguleu30@gmail.COM  " reached the
 * API as "Trim.Chouguleu30@gmail.COM". Whether that signs in depends entirely on
 * whether the backend happens to compare case-insensitively — and if it does not,
 * an account created from one capitalisation cannot be signed into from another,
 * which looks like a wrong password and cannot be diagnosed from the page.
 *
 * THE WHOLE ADDRESS, local part included. RFC 5321 does technically allow the
 * part before the @ to be case-sensitive, so this is not lossless in the strictest
 * reading — but no mail provider in practice treats "Jane@" and "jane@" as
 * different mailboxes, and normalising is what makes sign-in agree with the
 * registration that created the account. Doing only the domain would leave exactly
 * the bug being fixed.
 *
 * SHARED BY BOTH FORMS on purpose: register stores what this produces and sign-in
 * sends what this produces, so the two cannot disagree. `login-throttle.ts` keys
 * its buckets on a lower-cased address for the same reason.
 *
 * Transforms run before the checks below, so `.min(1)` sees the trimmed string and
 * "   " is reported as missing rather than malformed. Verified against zod 4.4.3.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
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

/**
 * Applies `ok` to a number's AREA CODE and its EXCHANGE (the first and second
 * groups of three), returning true if both pass.
 *
 * Shared so the two structural phone rules test exactly the same two substrings —
 * they differ only in what they assert about each, and one of them silently
 * checking a different slice than the other is the kind of drift that produces a
 * message describing a fault the value does not have.
 *
 * Returns TRUE for an empty value (the field is optional) and for anything that
 * is not ten digits, so the "exactly 10 digits" rule keeps ownership of that
 * message instead of three rules firing at once about the same typo.
 */
function forEachNanpPart(
  value: string,
  ok: (part: string) => boolean,
): boolean {
  if (value === "") return true;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10) return true;
  return ok(digits.slice(0, 3)) && ok(digits.slice(3, 6));
}

export const registerSchema = z.object({
  /*
   * LENGTH BOUNDS ADDED (Ryan, 2026-08-19), after a 98-character run of keyboard
   * mash was accepted: there was a `min(1)` and NO CEILING at all.
   *
   * THE API IMPOSES NEITHER, which is why this has to. Probed at 20, 50, 51, 64,
   * 100, 200, 255 and 256 characters against `f_name`: every one passed
   * validation and reached the duplicate-email check, so the endpoint expresses
   * no limit and picking a number here cannot cause a 422 it would have caught.
   * (It also means an over-long name would only ever fail later, at whatever the
   * column width turns out to be, with no message worth showing.)
   *
   * 2 as the floor, not 1: this is a FULL name, so a single character is not a
   * plausible one. Deliberately not "two words" — that would reject mononyms and
   * anyone who goes by one name, which is a worse failure than accepting a typo.
   *
   * 50 as the ceiling, and it is not a fresh number: `contact-schema.ts` already
   * caps a name at 50 there. Note it applies that PER field across a separate
   * first and last, so 50 on this combined box is the stricter reading — chosen
   * over 100 because 100 would still have accepted the string that prompted this,
   * and because 50 comfortably fits a long real name ("Maria del Carmen Fernández
   * de la Vega Sanz" is 42).
   *
   * `.trim()` runs before both, so leading and trailing spaces count towards
   * neither bound.
   */
  fullName: z
    .string()
    .trim()
    .min(1, "Full Name is required")
    .min(2, "Full Name must be at least 2 characters")
    .max(50, "Full Name must be 50 characters or less")
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
      /* Supplied wording (Ryan, 2026-08-19), replacing the live site's own
         "Phone number must be 10 digits". "exactly" is worth the two syllables:
         the rule is a single length, not a floor, and the old phrasing read as a
         minimum to anyone typing an 11-digit number with a country code. */
      "Phone number must contain exactly 10 digits.",
    )
    /*
     * SHAPE, not just length (Ryan, 2026-08-19: "0000000000 passes. Consider
     * rejecting all-identical digits / invalid area codes").
     *
     * Ten digits was the only test, so every repdigit and every impossible area
     * code got through and was posted to the API as a phone number.
     *
     * All-identical first, because it is the case in the report and it deserves
     * its own sentence. Note the structural rule below already catches 0000000000
     * and 1111111111 on its own (both start 0/1) — this exists for 2222222222 and
     * up, which are structurally legal and still obviously not numbers.
     */
    .refine(
      (v) => v === "" || !/^(\d)\1{9}$/.test(v.replace(/\D/g, "")),
      "That doesn't look like a real phone number.",
    )
    /*
     * NANP structure, and only the parts that are genuinely impossible rather
     * than merely unassigned — an over-strict rule here rejects real numbers, and
     * this list does not change.
     *
     *   · An area code and an exchange both start 2–9. 0 and 1 are reserved as
     *     trunk prefixes, so "(012)" and "(555) 123" style numbers cannot exist.
     *   · Neither may be N11: 211, 311, 411, 511, 611, 711, 811, 911 are service
     *     codes. This is why 9111234567 has to fail.
     *
     * DELIBERATELY NOT CHECKED: 555-01XX, the range reserved for fiction. It is
     * technically unusable, but this form's own placeholder is "(555) 555-0123" —
     * rejecting the example printed in the field would be a worse bug than
     * accepting a fake number. Verified the placeholder still passes everything
     * above. Also not checked: unassigned area codes, which change over time and
     * would need a maintained list to avoid rejecting new ones.
     *
     * TWO REFINES, NOT ONE, because one message could not describe both faults
     * honestly. Merged, "cannot start with 0 or 1" was shown for "(911) …" — a
     * number that starts with 9 — which is the same defect as a password rule
     * that enforces a lower-case letter without mentioning it. Each rule now
     * states the thing it actually tests.
     */
    .refine(
      (v) => forEachNanpPart(v, (part) => /^[2-9]/.test(part)),
      "An area code or prefix cannot start with 0 or 1.",
    )
    .refine(
      (v) => forEachNanpPart(v, (part) => !/^\d11$/.test(part)),
      "An area code or prefix cannot be a service code like 411 or 911.",
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
