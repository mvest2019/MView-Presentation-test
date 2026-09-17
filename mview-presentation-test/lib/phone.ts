/**
 * ONE PHONE FORMATTER, FOR EVERY BOX THAT TAKES A PHONE NUMBER.
 *
 * ── WHY IT LEFT `register-form.tsx` ──
 *
 * It was defined inside the register form and the profile form had nothing, so
 * the two boxes that ask the same question behaved differently: one formatted
 * `5551234567` into `(555) 123-4567` as it was typed and capped the tenth
 * digit, the other took whatever was pasted. Asked for directly — the profile
 * field should read like the register field — and the way to make two fields
 * agree is one function, not a second copy that drifts the first time only one
 * of them is edited.
 *
 * Nothing about the behavior changed in the move. What follows is the reasoning
 * that shipped with it.
 *
 * ── THE TEN-DIGIT CAP IS `slice(6, 10)` ──
 *
 * Everything past the tenth digit is discarded rather than rejected, so an 11th
 * keystroke is simply absorbed (Ryan, 2026-08-19: "need to type only 10 digit
 * restrict").
 *
 * `maxLength` COULD NOT DO THIS, and removing it was a fix rather than a
 * tidy-up. 14 is the length of the FORMATTED number, "(555) 555-0123" — so
 * someone typing bare digits got fourteen of them in before the control
 * stopped. Dropping it to 10 is not the fix either: it would then refuse the
 * last four characters of the number the placeholder itself shows. And the
 * attribute truncates the RAW string before any handler runs, so a paste longer
 * than 14 characters lost its tail and was then formatted from the survivors:
 * "+1 (555) 555-0123" (17 chars) became "(155) 555-50" — eight digits, wrong
 * area code, silently. Measured, not guessed. This function is the real cap:
 * its longest possible output is the 14 of "(555) 555-0123", so the attribute
 * could never fire on a legitimate value and only ever did harm.
 *
 * ── PARTIAL INPUT FORMATS AS IT GROWS ──
 *
 * So the punctuation appears under the caret rather than all at once at the
 * end: "5" → "(5", "5551" → "(555) 1". That is the live site's behavior and the
 * reason the opening bracket is unbalanced mid-type.
 *
 * Returns "" for an empty or all-punctuation string, which matters because the
 * field is optional in both forms and the register schema's checks all
 * short-circuit on "".
 *
 * Ported from `formatPhoneNumber` in the live repo's
 * `app/register/_components/RegistrationValidation.ts`.
 */
export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 0) return "";
  if (numbers.length <= 3) return `(${numbers}`;
  if (numbers.length <= 6)
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

/**
 * THE ONE PLACEHOLDER, for the same reason as the one formatter.
 *
 * A real-looking number rather than a mask of underscores. `(___) ___-____`
 * describes the shape but reads as a half-filled field at a glance — several
 * readers will try to type into the brackets — and it cannot show what the
 * formatter is about to do to their keystrokes. `(555) 555-0123` is the output
 * of this module's own function, so the hint and the behavior cannot disagree,
 * and 555-01xx is the range reserved for examples.
 */
export const PHONE_PLACEHOLDER = "(555) 555-0123";
