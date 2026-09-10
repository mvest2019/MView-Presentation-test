import type { SessionUser } from "@/lib/session";

/**
 * THE SIGNED-IN MEMBER, as the portal chrome needs to print them.
 *
 * WHY THIS EXISTS AS A MODULE. Three surfaces show the same identity — the top
 * bar's avatar, the account menu's head, and the mobile drawer's foot — and each
 * needs the same four derived values. Written out three times, the initials in
 * the drawer would eventually disagree with the initials in the bar, which is
 * the class of bug the note on `alertCounts` in `portal-nav.ts` is about: three
 * copies of one number is how a badge starts lying.
 *
 * THE MEMBER IS NOT THE OWNER RECORD, and this module is only about the member.
 * `demoOwner.record` ("SMITH, RAYMOND E") is the mineral owner record the
 * account has claimed; it is fictional demo data, it stays in
 * `portal-demo-data.ts`, and it is printed beside — never instead of — what is
 * derived here. See the header of `portal-demo-data.ts` for why that record is
 * still demo, and the portal's four disclosure surfaces for how it is labelled.
 *
 * NO SESSION IS A REAL ANSWER, not an error. The portal is not an auth boundary
 * (see `(portal)/layout.tsx`), so it is reachable signed out, and every caller
 * here handles `null` by falling back to the demo persona rather than by hiding
 * its chrome.
 */
export interface PortalMember {
  /** Their full name, or their email's local part when the record has no name. */
  name: string;
  /** First name only, for a greeting or a tight slot. */
  firstName: string;
  /** One or two letters for the avatar tile — never empty. */
  initials: string;
  email: string;
  /** `profile_pic`, when the record carries one. Null is the common case. */
  image: string | null;
}

/**
 * Two initials from a full name, one from a single word.
 *
 * FIRST AND LAST, not the first two words: "Raymond E Smith" should read RS, and
 * a middle initial in the middle of the name should not become the second
 * letter of the tile.
 */
function initialsFrom(parts: string[]): string {
  const letters = parts
    .map((part) => part.trim()[0])
    .filter((letter): letter is string => Boolean(letter));
  if (!letters.length) return "";
  if (letters.length === 1) return letters[0].toUpperCase();
  return `${letters[0]}${letters[letters.length - 1]}`.toUpperCase();
}

/**
 * The session user as the chrome prints them, or null when signed out.
 *
 * EVERY FIELD DEGRADES RATHER THAN BLANKS. `f_name`/`l_name` are both nullable
 * upstream and `startSession` stores `""` for a missing one, so an account can
 * genuinely reach here with no name at all — a Google sign-in that returned only
 * an address, for instance. In that case the email's local part is the name and
 * its first letter is the tile, which is a professional fallback; an empty
 * avatar circle is not.
 */
export function portalMember(user: SessionUser | null): PortalMember | null {
  if (!user) return null;

  const parts = [user.firstName, user.lastName]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean);
  const email = user.email?.trim() ?? "";
  const localPart = email.split("@")[0] ?? "";

  const name = parts.join(" ") || localPart || "Your account";
  const initials = initialsFrom(parts) || initialsFrom([localPart]) || "ME";

  return {
    name,
    firstName: parts[0] || localPart || "there",
    initials,
    email,
    image: user.profileImage ?? null,
  };
}
