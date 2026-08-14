import { z } from "zod";

/**
 * Shape of the contact form, and of the request body sent to the contact API.
 *
 * Field names match the backend contract exactly — `comment`, not `message` —
 * so the validated object can be posted as-is with no mapping step in between.
 * Renaming a field here changes the request body.
 */

/**
 * A name: starts with a letter, then letters, spaces, hyphens, apostrophes and
 * full stops. `\p{L}` is any script's letters and `\p{M}` the combining accents,
 * so José, Ní Bhraonáin and 王 all pass — a plain `[A-Za-z]` class would reject
 * real people. Digits and other symbols are what this is here to catch: before
 * it, "123" and "@#$" were accepted as first names.
 *
 * Deliberately no minimum beyond one character. Two would read as safer but
 * single-letter given names and surnames do exist, and rejecting them is a worse
 * failure than accepting a typo.
 */
const NAME = /^\p{L}[\p{L}\p{M}'’. -]*$/u;

/**
 * Phone punctuation: digits, spaces, brackets, dots and dashes, with `+`
 * permitted only as the first character. That last part is the fix for
 * "122316449+64", which the old `[-+().\s\d]{7,}` accepted because it allowed
 * `+` anywhere in the string.
 */
const PHONE_SHAPE = /^\+?[\d\s().-]+$/;

/** E.164 allows at most 15 digits; 10 is the shortest number worth accepting. */
const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;

function nameField(missing: string, invalid: string, long: string) {
  return z
    .string()
    .trim()
    .min(1, missing)
    .max(50, long)
    .regex(NAME, invalid);
}

export const contactSchema = z.object({
  firstName: nameField(
    "Tell us your first name.",
    "Use letters only — no numbers or symbols.",
    "That first name is too long — 50 characters at most.",
  ),
  lastName: nameField(
    "Tell us your last name.",
    "Use letters only — no numbers or symbols.",
    "That last name is too long — 50 characters at most.",
  ),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(254, "That email address is too long.")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "That doesn't look like an email address."),
  /** Optional — every check below is skipped when the field is left empty. */
  phone: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return;

      if (!PHONE_SHAPE.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: "Use digits only — spaces, brackets and dashes are fine.",
        });
        return;
      }

      // One message per problem, so the visitor is told which it is.
      const digits = value.replace(/\D/g, "").length;
      if (digits < PHONE_MIN_DIGITS) {
        ctx.addIssue({
          code: "custom",
          message: `That number looks short — ${PHONE_MIN_DIGITS} digits at least.`,
        });
      } else if (digits > PHONE_MAX_DIGITS) {
        ctx.addIssue({
          code: "custom",
          message: `That number looks long — ${PHONE_MAX_DIGITS} digits at most.`,
        });
      }
    }),
  comment: z
    .string()
    .trim()
    .min(1, "Tell us what you need — a sentence is plenty.")
    .max(2000, "That is longer than we can send — 2000 characters at most."),
});

export type ContactValues = z.infer<typeof contactSchema>;
