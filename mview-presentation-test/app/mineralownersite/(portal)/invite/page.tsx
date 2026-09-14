import type { Metadata } from "next";

import { gates } from "../../_components/ui/portal-gating";
import {
  InviteFootnotes,
  InviteHeader,
  UnclaimedInviteNotice,
} from "./_components/invite-header";
import { InviteWorkbench } from "./_components/invite-workbench";

/**
 * INVITE CO-OWNERS — `/mineralownersite/invite`.
 *
 * THE COMMUNITY SECTION'S SECOND ROW, and the one the sidebar's referral panel
 * has been pointing at since it was written. `portal-nav.ts` gets its `href`
 * with this page; `portal-routes.ts` gets the path, which turns every
 * "Invite a co-owner" in `OWNER_ACTIONS` into a real link at once.
 *
 * ── WHAT THE PAGE IS ──
 *
 * Three numbered cards and a rail. Pick a lease, tick the people you know, copy
 * the email — and the steps stand in a sticky column where they never scroll
 * away. The rail carries the reader's own four steps, their co-owner's four
 * (hollow, because claiming by code is unbuilt), and what the selection could
 * earn.
 *
 *  1  InviteHeader        the premise: the roll already names these people
 *  2  InviteWorkbench     the three steps and the rail — the whole of the work
 *  3  InviteFootnotes     what a code is not, and who does the sending
 *
 * ── WHAT IS WIRED AND WHAT IS NOT ──
 *
 * WIRED, AND REAL: the lease picker, the search, the filter, the ticks, the
 * greeting, the letter composition, every code, and both copy buttons. A reader
 * can finish the job this page is for — the letters that reach the clipboard
 * are complete and correct, and sending them was always going to happen in
 * their own mail client.
 *
 * NOT WIRED: the co-owner lists are the fixture in `_lib/invite-records.ts`,
 * not a read of the county appraisal roll, and nothing is recorded when a
 * letter is copied — no sent list, no status, no credit ledger. The page says
 * both in `InviteFootnotes` rather than implying otherwise, and the rail draws
 * every step that depends on the missing write store as unbuilt.
 *
 * ── THE TOP-LEVEL SECTIONS ARE FLAT, AND HAVE TO BE ──
 *
 * `portal.css` gates a module by selecting DIRECT CHILDREN of `.mv-dash-routes`:
 * the unclaimed swap hides every sibling of the `.nc-swap` panel. Wrapping
 * these three in a layout div would put them out of its reach, and an unclaimed
 * visitor would get the notice AND a full page of cards listing co-owners of
 * leases they have not claimed.
 *
 * ── NO ULTRA VARIANT, DELIBERATELY ──
 *
 * The page carries `pageRoot` for the unclaimed swap above, and Ultra's rule
 * hides every child that is not `tier-u`. There is no honest one-line Ultra
 * form of "choose which of twenty-four people to write to" — the choosing IS
 * the page — so nothing here is marked `tier-u` and an Ultra reader gets the
 * page as it stands. That is a decision, not an omission: see the warning in
 * `_components/ui/portal-ui.md`.
 */
export const metadata: Metadata = {
  title: "Invite Co-Owners",
  description:
    "The other owners of your leases are named on the public appraisal roll. Pick the ones you know and an email is written for each of them, with their own invite code.",
};

export default function InviteCoOwnersPage() {
  return (
    <div className={gates("pageRoot")}>
      <UnclaimedInviteNotice />
      <InviteHeader />
      <InviteWorkbench />
      <InviteFootnotes />
    </div>
  );
}
