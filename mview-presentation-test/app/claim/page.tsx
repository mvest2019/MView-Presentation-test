import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { INVITE_CODE_PARAM, normaliseInviteCode } from "@/lib/invite-code";
import { getSessionUser } from "@/lib/session";

import { ClaimFinder } from "./_components/claim-finder";

export const metadata: Metadata = {
  title: "Find Your Record | Mineral View",
  description:
    "Search Texas county appraisal mineral rolls by name, lease, or county — find and claim your owner record, no account needed.",
};

/**
 * Find your record — the header CTA's destination (`/claim`).
 *
 * The whole page is the client-side finder: search runs in the browser over
 * the prebuilt index in `public/owners/` (no database at runtime), so there is
 * nothing to render on the server beyond the shell. See
 * `_components/claim-finder.tsx` for the engine's provenance and the
 * behaviours it preserves.
 *
 * ── `?code=` — THE INVITATION LINK LANDS HERE ──
 *
 * Every invite letter ends on `mineralview.com/claim?code=31597778`; that URL
 * is built by `invite-letters.ts` and is printed and emailed to co-owners, so
 * it is fixed and this page has to answer it. The recipient is, by definition,
 * somebody who does NOT have an account — the letter is an invitation to make
 * one — so a code in the query means the finder is the wrong first screen and
 * they are sent to `/register` with the code carried along.
 *
 * WHY THE REDIRECT IS UNCONDITIONAL, including for a signed-in visitor.
 * `/register` already turns a visitor who has a session away to the portal
 * (`getSessionUser()` → `redirect(PORTAL_HOME)`), which is the right end state
 * for somebody who followed an invite link while already a member: there is no
 * account for them to create. Branching here to keep them on the finder would
 * be a second answer to a question `/register` already answers, and the two
 * would drift.
 *
 * WHY THE CODE IS NORMALISED BEFORE IT IS PASSED ON. A code copied out of an
 * email by hand arrives hyphenated, spaced, or with `code=` still attached.
 * `normaliseInviteCode` reduces all of those to the eight digits, and a value
 * that is NOT a code — a truncated paste, somebody's experiment — returns null
 * and is dropped rather than forwarded, so `/register` never has to render a
 * pre-filled field containing nonsense. The visitor still lands on the sign-up
 * form and can type the code themselves.
 */
export default async function ClaimPage({
  searchParams,
}: PageProps<"/claim">) {
  const params = await searchParams;
  const raw = params[INVITE_CODE_PARAM];
  const code = normaliseInviteCode(Array.isArray(raw) ? raw[0] : raw);
  if (code) {
    redirect(`/register?${INVITE_CODE_PARAM}=${code}`);
  }

  // Read on the server, like the header does: a signed-in visitor who claims
  // a record goes straight to their portal instead of the sign-up pitch.
  const user = await getSessionUser();
  return (
    <ClaimFinder signedIn={user !== null} memberId={user?.id ?? null} />
  );
}
