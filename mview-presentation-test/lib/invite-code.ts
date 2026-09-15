/**
 * THE INVITATION CODE, AND THE ONE PLACE ITS SHAPE IS DECIDED.
 *
 * ── WHERE THE CODE COMES FROM ──
 *
 * `(reference)/invite/_lib/invite-letters.ts` mints it: `codeFor(leaseId,
 * ownerNumber)` is an FNV-1a fold of the lease and the owner's roll number,
 * forced non-zero in its first digit so it is always eight characters. Its own
 * note explains why it is derived rather than issued — this build has nowhere
 * to store a reserved code, so the same lease and owner have to produce the
 * same code every time a letter is reprinted.
 *
 * ── WHY IT IS WRITTEN TWO WAYS, AND WHY BOTH HAVE TO PARSE ──
 *
 * The letter PRINTS `3159-7778`, because that is how a person reads eight
 * digits off paper and types them back. The link in the same letter carries
 * `?code=31597778`, because a hyphen in a query string is one more thing to get
 * wrong when a URL is copied by hand out of an email.
 *
 * So a code arrives in at least four forms: from the link (bare), typed off the
 * page (hyphenated), pasted from the email with a stray space, or pasted with
 * the whole `code=` fragment attached. `normalise` accepts all of them and
 * returns the eight digits; `format` puts the hyphen back for display.
 *
 * ── WHAT "VALID" MEANS HERE, AND WHAT IT DOES NOT ──
 *
 * `isWellFormed` answers ONE question: is this eight digits. It cannot answer
 * whether the code exists, who it belongs to, or whether it has already been
 * used — those need the invitation store, which does not exist yet (see
 * `(reference)/billing/BILLING_API.md` and the note in `auth-actions.ts`).
 *
 * That distinction is load-bearing for registration. A badly-shaped code is the
 * reader's typo and is worth stopping at the field. An unknown code is a fact
 * about the server, and it must NOT stop an account being created — the person
 * still wants an account, and refusing them because a relative's code expired
 * would be the worst outcome this flow can produce.
 */

/** eight digits, which is what `codeFor` produces */
const DIGITS = 8;

/**
 * Anything a reader might hand us → the bare eight digits, or `null`.
 *
 * Non-digits are STRIPPED rather than rejected, which is what lets one function
 * take `3159-7778`, `3159 7778`, `code=31597778` and a pasted full URL. The
 * length check then runs on what is left, so a nine-digit paste fails rather
 * than being silently truncated to something that looks plausible.
 */
export function normaliseInviteCode(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D/g, "");
  return digits.length === DIGITS ? digits : null;
}

/**
 * `31597778` → `3159-7778`, the grouped form the LETTER prints.
 *
 * NOT what the register field shows any more. That box carries the bare digits:
 * the hyphen is punctuation the reader never typed and has to edit around, and
 * it is not part of the code. It stays here because paper is a different
 * medium — eight unbroken digits are easy to lose your place in when copying
 * them off a printed page — and because `normaliseInviteCode` accepts either
 * form, so the two can differ safely.
 */
export function formatInviteCode(code: string): string {
  const digits = String(code).replace(/\D/g, "");
  return digits.length === DIGITS
    ? `${digits.slice(0, 4)}-${digits.slice(4)}`
    : String(code);
}

/**
 * Is this the right SHAPE — not, is it a real invitation. See the header.
 *
 * An empty string is well-formed, because the field is optional and every
 * caller would otherwise have to special-case "" before asking.
 */
export function isWellFormedInviteCode(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  const trimmed = String(raw).trim();
  if (trimmed === "") return true;
  return normaliseInviteCode(trimmed) !== null;
}

/** the query parameter the invite letters put the code in */
export const INVITE_CODE_PARAM = "code";

/** the message shown when the shape is wrong — one string, two call sites */
export const INVITE_CODE_FORMAT_MESSAGE =
  "An invite code is eight digits, like 31597778. Leave it empty if you do not have one.";
