import { PortalLink } from "../../../_components/portal-link";
import { portalButtonClass } from "../../../_components/ui/button";
import {
  BALANCE,
  BALANCE_CENTS,
  CREDITED_COUNT,
  EARN_LINE,
  INVITE_HREF,
  LEDGER_HREF,
} from "../../../_lib/referral-credits";
import { PROFILE_SECTIONS } from "../_lib/profile-data";
import { ProfileCardShell } from "./profile-shell";

/**
 * INVITATIONS & CREDITS.
 *
 * ── WHY THIS IS ON THE PROFILE AT ALL ──
 *
 * `page.tsx` argues that plan and capacity do NOT belong here, because Billing
 * owns them and a summary would be "a second, staler answer on screen next to
 * that page's real one". That argument is right and this card is built to
 * respect it rather than to make an exception to it.
 *
 * The difference is whose the thing is. A plan belongs to the ACCOUNT. A
 * referral credit is earned by THIS PERSON, by writing to a co-owner they
 * actually know — it is the one number on the billing page that is a
 * consequence of something the reader did rather than something they bought.
 * So the balance sits beside the person, and everything that is the
 * subscription's — the price, the term, the renewal arithmetic, the full
 * posting history — stays on Billing and is linked to rather than repeated.
 *
 * ── AND IT CANNOT GO STALE, BECAUSE THERE IS ONLY ONE COPY ──
 *
 * The balance, the ledger and the earn rule all come from
 * `_lib/referral-credits.ts`, which Billing reads too. The rule itself is
 * re-exported from the invite page's own `CREDIT` policy. Three pages, one
 * source: that is what makes putting the figure here safe, and it is the
 * condition on which it was added.
 *
 * ── TWO WAYS OUT, AND THEY GO TO DIFFERENT PLACES ON PURPOSE ──
 *
 * "Invite co-owners" is the action — it opens the page that earns the credit.
 * "See the full ledger" is the record — it opens Billing at the credits fold.
 * A reader arriving at a balance wants one or the other, and a single link
 * would have to guess which.
 *
 * ── NOTHING IS FABRICATED ──
 *
 * There is no store recording how many invitations were sent, so this card
 * does not claim one. It counts the postings that actually paid, which the
 * ledger does record, and says nothing about letters — the invite page's own
 * rail is where a send-versus-paid argument belongs.
 */
export function InvitationsCard() {
  const earned = BALANCE_CENTS > 0;

  return (
    <ProfileCardShell
      section={PROFILE_SECTIONS.invitations}
      action={
        <PortalLink href={LEDGER_HREF} className="text-[13px] font-semibold">
          See the full ledger
        </PortalLink>
      }
    >
      <p className="mt-1 mb-3 max-w-[68ch] text-[12.5px] leading-[1.55] text-mv-muted">
        {EARN_LINE}
      </p>

      {/* THE BALANCE, AS A FIGURE AND AS A SENTENCE. A bare "$100.00" on a
          profile answers nothing — a reader has to be told what it is for, and
          the one thing a credit does is come off the next renewal. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-mv border border-mv-line bg-mv-portal-wash px-[14px] py-3">
        <strong className="text-[26px] leading-none font-bold tabular-nums text-mv-ink">
          {BALANCE}
        </strong>
        <span className="text-[12.5px] text-mv-slate">
          {earned ? "in referral credit" : "in referral credit — none earned yet"}
        </span>
        {earned ? (
          <span className="ml-auto text-[11.5px] text-mv-muted">
            applies automatically at your next renewal
          </span>
        ) : null}
      </div>

      {earned ? (
        <p className="mt-2 text-[11.5px] leading-[1.5] text-mv-muted">
          From {CREDITED_COUNT}{" "}
          {CREDITED_COUNT === 1 ? "co-owner who" : "co-owners who"} took a paid
          plan. Credits are non-cash and spend on services or come off the
          renewal — there is nothing to cash out.
        </p>
      ) : (
        <p className="mt-2 text-[11.5px] leading-[1.5] text-mv-muted">
          Nothing posts for sending a letter, and nothing posts for a free
          signup — the credit lands when somebody you invited takes a paid plan.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PortalLink
          href={INVITE_HREF}
          className={portalButtonClass({ variant: "primary", size: "sm" })}
        >
          Invite co-owners
        </PortalLink>
        <span className="text-[11.5px] text-mv-muted">
          The other owners of your leases are named on the public appraisal roll.
        </span>
      </div>
    </ProfileCardShell>
  );
}
