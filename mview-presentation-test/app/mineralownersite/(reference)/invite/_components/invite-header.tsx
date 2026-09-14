import { Notice } from "../../../_components/ui/notice";
import { PortalLink } from "../../../_components/portal-link";
import { gates } from "../../../_components/ui/portal-gating";
import { inviteSender } from "../_lib/invite-records";

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
 */
export function InviteHeader() {
  return (
    <div className="mb-3">
      <span className="text-[11px] font-bold tracking-[0.06em] text-mv-green-deep uppercase">
        Bring the family in
      </span>
      <h1 className="mt-0.5 text-[26px] leading-tight font-bold">
        Invite Co-Owners
      </h1>
      <p className="mt-1 max-w-[68ch] text-[13px] leading-[1.55] text-mv-muted">
        Everyone who owns a share of your leases is named on the public
        appraisal roll. Pick the ones you know, and an email is written for each
        of them — their own name, their own invite code — ready for you to send.
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
 * has to be a DIRECT CHILD of the page root — see `portalGate.pageRoot`.
 */
export function UnclaimedInviteNotice() {
  return (
    <Notice
      tone="slate"
      glyph="ⓘ"
      className={`${gates("unclaimedOnly", "unclaimedSwap")} mb-3`}
    >
      <strong>Claim your record first.</strong> The people you would invite are
      the other owners of <em>your</em> leases, read off the county appraisal
      roll — so there is nobody to list until Mineral View knows which record is
      yours. Claiming is free and takes a couple of minutes, and it does not
      change legal ownership of anything.{" "}
      <PortalLink href="/mineralownersite/claim">
        Claim your mineral owner record
      </PortalLink>
      .
    </Notice>
  );
}

/**
 * WHAT A CODE IS NOT — the one thing this build has to admit that the cards
 * above have no room for.
 *
 * WHY AT THE FOOT AND NOT IN A TOOLTIP: it answers a question a reader only
 * forms after they have seen a code. Put above the cards it is a caveat on
 * something not yet read; put below, it is an answer.
 *
 * WHY ON THE PAGE AT ALL: an eight-digit code that appears in a letter looks
 * issued, and these are worked out rather than reserved. Nothing is written
 * down, so there is no sent list and no status to come back to — and a reader
 * who assumes otherwise will return next week looking for one.
 *
 * `sendNote` IS NOT REPEATED HERE. It was, and the page then carried the same
 * paragraph twice within one screen of itself — once under the copy button and
 * once in a card beneath. It belongs under the copy button, which is the moment
 * a reader would otherwise sit back and wait for an email to go out, so that is
 * where the only copy of it lives. See `EmailStep`.
 */
export function InviteFootnotes() {
  return (
    <div className="mt-[18px] rounded-mv border border-mv-line bg-mv-portal-explain p-[14px]">
      <h2 className="m-0 text-[11px] font-bold tracking-[0.06em] text-mv-muted uppercase">
        About the codes
      </h2>
      <p className="m-0 mt-1.5 max-w-[92ch] text-[12px] leading-[1.6] text-mv-slate">
        {inviteSender.codeNote}
      </p>
    </div>
  );
}
