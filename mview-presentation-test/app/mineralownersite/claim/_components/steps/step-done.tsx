"use client";

import { Check, Info, LayoutGrid, UserPlus, Zap } from "lucide-react";
import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { PortalButtonLink } from "../../../_components/ui/button";
import { PrototypeButton } from "../../../_components/ui/prototype-button";
import { claimReference, ownerGroups, type DoneIcon } from "../../_lib/claim-done";
import { freeVisibleLeases } from "../../_lib/claim-plans";
import { claimCandidates } from "../../_lib/claim-records";
import { claimTotals, leasesByValue } from "../../_lib/claim-totals";
import { DoneIconTile } from "../done-icons";

/**
 * THE COMPLETION SCREEN — what the last button on step 5 lands on.
 *
 * ── IT IS A RECEIPT, NOT A CELEBRATION ──
 *
 * The tick and the "100%" are two lines of it; the rest is a list of exactly
 * what was written and what it means. An owner who has just attached their name
 * to a public mineral record wants to read back what happened, in the same terms
 * the flow used to ask for it — which is why the five rows below mirror the five
 * steps rather than summarising them in prose.
 *
 * ── FIVE CARDS, NOT FIVE BULLETS ──
 *
 * Each line was a tick and two lines of text inside one bordered box. As
 * separate cards — glyph, title, detail, and a "Completed" chip — each one reads
 * as a thing that HAPPENED rather than a feature being listed at the reader.
 * The chip is the tick's job done more plainly.
 *
 * ── EVERY FIGURE IS DERIVED ──
 *
 * The record id, the owner name, the lease counts, the county list and the
 * visible lease all come from the claim the reader just made — nothing here is
 * typed twice. The visible lease in particular is whichever one they chose on
 * step 5, not a fixture: telling someone their free lease is X when they picked
 * Y is the one factual error this screen must not make.
 *
 * ── THE OFF-ADDRESS RECORDS ARE REPORTED SEPARATELY ──
 *
 * Step 3 promised that a record whose mail goes elsewhere needs a posted code
 * before it attaches. If the reader ticked one, this screen has to say it is NOT
 * attached yet rather than folding it into the count — otherwise the flow made a
 * promise on one screen and broke it on the next. It is a NEUTRAL note, not an
 * amber warning: nothing has gone wrong, a letter is simply in the post.
 */
export function StepDone({
  confirmedIds,
  visibleNumber,
}: {
  confirmedIds: string[];
  visibleNumber: string;
}) {
  const claimed = claimCandidates.filter(
    (c) => confirmedIds.includes(c.id) && c.matchesMailing,
  );
  const pending = claimCandidates.filter(
    (c) => confirmedIds.includes(c.id) && !c.matchesMailing,
  );
  const primary = claimed[0] ?? claimCandidates[0];

  const visibleLease =
    leasesByValue.find((l) => l.number === visibleNumber) ?? leasesByValue[0];
  const archived = claimTotals.count - freeVisibleLeases;

  const rows: { icon: DoneIcon; title: string; detail: React.ReactNode }[] = [
    {
      icon: "record",
      title: "Record claimed",
      detail: `${primary.name} · ${primary.id} · ${primary.mailCity}`,
    },
    {
      icon: "leases",
      title: "Leases attached",
      detail: `${claimTotals.count} found — ${claimTotals.producing} producing, ${claimTotals.inactive} inactive · ${claimTotals.countyList} ${claimTotals.counties === 1 ? "county" : "counties"}`,
    },
    {
      icon: "visible",
      title: "Visible on your plan",
      detail: (
        <>
          {freeVisibleLeases} lease in full —{" "}
          <b className="font-semibold text-mv-ink">
            {visibleLease.name} ({visibleLease.number})
          </b>
          . The other {archived} stay archived: listed, counted, values locked,
          never deleted.
        </>
      ),
    },
    {
      icon: "groups",
      title: "Groups joined",
      detail: `${ownerGroups.length} owner groups matched to your leases, county, operator and play.`,
    },
    {
      icon: "briefing",
      title: "Weekly briefing scheduled",
      detail: "Your first one lands this Saturday morning.",
    },
  ];

  return (
    <div className="grid gap-[14px]">
      {/* THE TICK SITS BESIDE THE HEADING, not above it — the same pairing the
          five steps use for their glyph and title (`step-intro.tsx`). Stacked,
          the disc spent a whole line saying what the green "CLAIM COMPLETE"
          underneath it already said, and pushed the receipt itself further down.

          `items-start`, not `items-center`: this block runs to three lines and
          the headline wraps to two on a narrow column, so centring a 36px disc
          against it would leave the tick floating in the middle of the
          paragraph instead of marking its start. */}
      <header className="flex items-start gap-3">
        <span className="mt-[1px] flex h-[36px] w-[36px] flex-none items-center justify-center rounded-full bg-mv-mint text-mv-green-deep">
          <Check aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={3} />
        </span>

        <div className="min-w-0">
          <p className="text-[10.5px] font-bold tracking-[.12em] text-mv-green-deep uppercase">
            Claim complete · 100%
          </p>

          <h2 className="mt-[4px] text-[clamp(18px,2.4vw,22px)] font-extrabold leading-[1.2] tracking-[-.015em] text-mv-ink">
            Claim written · record {primary.id} · {claimTotals.count} leases
            joined
          </h2>

          {/* Muted, with the reference itself the only dark thing in the line —
              it is the one part a reader is being asked to copy down. */}
          <p className="mt-[8px] text-[12px] leading-[1.6] text-mv-muted">
            Claim reference{" "}
            <b className="font-bold text-mv-ink">{claimReference}</b> — keep this
            if you ever write to support; a confirmation email is on its way.
          </p>
        </div>
      </header>

      <ul className="grid gap-[10px]">
        {rows.map((row) => (
          <li
            key={row.title}
            className="flex items-center gap-3 rounded-mv border border-mv-line bg-mv-card p-3"
          >
            <DoneIconTile name={row.icon} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-mv-ink">{row.title}</p>
              <p className="mt-[2px] text-[11.5px] leading-[1.5] text-mv-muted">
                {row.detail}
              </p>
            </div>
            <Badge tone="mint" size="xs" className="flex-none self-start">
              Completed
            </Badge>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <p className="flex items-start gap-[10px] rounded-mv border border-mv-line bg-mv-portal-wash/60 px-4 py-3 text-[11.5px] leading-[1.55] text-mv-slate">
          <Info aria-hidden="true" className="mt-[1px] h-[14px] w-[14px] flex-none text-mv-muted" />
          <span>
            <b className="font-semibold text-mv-ink">
              {pending.length} more record{pending.length === 1 ? "" : "s"}{" "}
              awaiting a mailed code
            </b>{" "}
            — {pending.map((c) => c.id).join(", ")}. Its leases join your account
            once the code you post back is matched. Nothing else changes until
            then.
          </span>
        </p>
      )}

      <p className="flex items-start gap-[10px] rounded-mv border border-mv-mint-edge bg-mv-mint/50 px-4 py-3 text-[11.5px] leading-[1.55] text-mv-green-ink">
        <Zap
          aria-hidden="true"
          className="mt-[1px] h-[14px] w-[14px] flex-none text-mv-green-deep"
        />
        <span>
          <b className="font-bold">
            We&rsquo;re building your portfolio — we&rsquo;ll email you when
            it&rsquo;s ready.
          </b>
          <br />
          Verifying your record and assembling your map, production history and
          estimate takes up to 24 hours, usually much less. Your groups are open
          right away.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
        <PortalButtonLink variant="dark" href="/mineralownersite">
          <LayoutGrid aria-hidden="true" className="h-[15px] w-[15px]" />
          Open my dashboard →
        </PortalButtonLink>
        <PrototypeButton
          acknowledgement="Invites sent ✓ (prototype)"
          size="md"
          icon={<UserPlus aria-hidden="true" className="h-[15px] w-[15px]" />}
          title="Opens the co-owner invite flow"
        >
          Invite my co-owners
        </PrototypeButton>
        <p className="ml-auto text-[12px] text-mv-muted">
          Claimed by mistake?{" "}
          <Link
            href="/mineralownersite/settings"
            className="font-semibold text-mv-green-deep underline underline-offset-2"
          >
            Unclaim in Settings
          </Link>
        </p>
      </div>
    </div>
  );
}
