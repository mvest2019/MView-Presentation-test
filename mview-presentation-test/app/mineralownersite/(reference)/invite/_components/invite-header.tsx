import Link from "next/link";

import { gates } from "../../../_components/ui/portal-gating";

/**
 * THE PAGE HEAD.
 *
 * THE STRAPLINE IS THE PREMISE OF THE WHOLE PAGE, and it has to be first
 * because it is the thing a reader does not already know: everyone who owns a
 * share of a Texas lease is named on the county's public appraisal roll. Until
 * that lands, "invite your co-owners" reads as a request to go and find some
 * email addresses.
 *
 * THE WORDS ARE THE REFERENCE'S, not this build's — `InviteView.tsx`'s own
 * `iv-top` block, to the em dashes. An earlier pass here opened the same
 * sentence and then spliced three derived counts into it ("24 people across
 * your 10 leases, 18 of them on MCCABE ETAL GU · Lease 290271 alone"). The
 * figures were live and correct, and the sentence was worse for them: the
 * reader is told the count of a lease they have not chosen yet, in the one
 * paragraph whose job is to explain WHY there is anybody to invite at all. The
 * headcount belongs on the control that uses it — every option in the step 1
 * picker carries its own — so it is there and not here.
 *
 * AND NOW THE MARKUP IS THE REFERENCE'S TOO. This was a Tailwind block with its
 * sizes written inline — `text-[11px]`, `text-[26px]`, `text-[13px]` — which
 * put the page's title at a size no other page in this group uses. It is
 * `.section-label` + `.iv-title` + `.small muted` now: the same three classes
 * the reference draws, resolving to the same scale Alerts and Activities are
 * drawn at. See `invite.css`.
 */
export function InviteHeader() {
  return (
    <div className="iv-top">
      <div className="section-label">Connect with Co-Owners</div>
      {/* AN `h1`, AND THE REFERENCE'S `h2` IS NOT COPIED HERE. This page brings
          its own view through `Portal`'s `children`, so nothing above it in the
          document is a heading — the title of the page is the document's
          heading, and the three step cards are one level under it. The SIZE is
          the other pages' 24px either way; see `.iv-title`. */}
      <h1 className="iv-title">Invite Co-Owners</h1>
      <p className="small muted">
        Mineral View uses public appraisal records to identify other owners
        associated with your selected lease. Choose the co-owners you recognize,
        and Mineral View will prepare a personalized invitation for each person,
        including their name and unique invitation code, ready for you to send.
      </p>
    </div>
  );
}

/**
 * THE NO-CLAIM SWAP.
 *
 * `unclaimedSwap` AND NOT A BANNER, which is the opposite of the choice
 * Settings makes — and the difference is what the page is about. Settings is
 * about the PERSON, so it stays fully usable with no claim. This page is about
 * ONE OWNER RECORD: which leases are yours, who else is on them, and a code
 * worked out from your own owner number. With nothing claimed there is no
 * record to read co-owners from, so every card below would be furniture around
 * an empty list.
 *
 * `portal.css` hides every sibling of an `.nc-swap` panel, which is why this
 * has to be a DIRECT CHILD of the page root — see `portalGate.pageRoot`. That
 * rule is inert in this route group (see `InviteView`, which does the swap in
 * React instead) and is left in place for the day the page moves back.
 *
 * DRAWN WITH THE GROUP'S OWN `.notice`, not the `(portal)` `Notice` component:
 * `dashboard-reference.css` ships `.notice` and its four tones, and this page
 * now takes every other surface from that sheet.
 */
export function UnclaimedInviteNotice() {
  return (
    <div className={`notice slate ${gates("unclaimedOnly", "unclaimedSwap")}`}
      style={{ margin: "18px 0 0" }}
    >
      <span aria-hidden="true">ⓘ</span>
      <span>
        <strong>Claim your record first.</strong> The people you would invite
        are the other owners of <em>your</em> leases, read off the county
        appraisal roll — so there is nobody to list until Mineral View knows
        which record is yours. Claiming is free and takes a couple of minutes,
        and it does not change legal ownership of anything.{" "}
        <Link href="/mineralownersite/claim">
          Claim your mineral owner record
        </Link>
        .
      </span>
    </div>
  );
}
