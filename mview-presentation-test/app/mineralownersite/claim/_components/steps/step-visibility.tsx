"use client";

import { Eye } from "lucide-react";

import {
  PortalButton,
  PortalButtonLink,
} from "../../../_components/ui/button";
import { claimPlans, freeVisibleLeases, planPrice } from "../../_lib/claim-plans";
import { claimTotals, leasesByValue } from "../../_lib/claim-totals";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { VisibilityCard } from "./visibility-card";

const [essentials, premium] = claimPlans;

/**
 * STEP 5 — visibility allocation.
 *
 * ── THIS IS A PAYWALL, AND THE ONE THING IT MUST NOT IMPLY ──
 *
 * That an unseen lease is a lost lease. Every archived card says "still
 * counted", the guide box states what archiving retains (membership, decimal
 * interest, lease identity), and the caption bar promises the whole set stays
 * on the record either way. An owner who reads this screen as "pay or forfeit
 * nine leases" has been told something false about their own minerals, which is
 * a worse outcome than a missed upgrade.
 *
 * ── THE PRE-SELECTION IS A RULE, NOT A CHOICE WE MADE FOR THEM ──
 *
 * Highest MVestimate first — stated in the heading, implemented by
 * `leasesByValue`, and reversible: every archived card offers "Show this one
 * instead". A default that cannot be changed is an allocation; one that can is
 * a starting point, and the difference matters when the default is worth $10,259
 * and the lease they actually care about is not.
 *
 * ── THE UPGRADE PRICES ARE FULLY STATED ──
 *
 * Monthly AND annual, with the term and the auto-renewal position spelled out
 * ("12-month term, never auto-renewed"). A price shown without its term is the
 * part of a paywall people report as a surprise later.
 */
export function StepVisibility({
  visibleNumber,
  onChoose,
  onFinish,
}: {
  /** The lease number currently occupying the single free slot. */
  visibleNumber: string;
  onChoose: (number: string) => void;
  /** The last button in the flow — writes the visibility flag and completes. */
  onFinish: () => void;
}) {
  const visibleLease =
    leasesByValue.find((lease) => lease.number === visibleNumber) ??
    leasesByValue[0];

  return (
    <div className="grid gap-[18px]">
      {/* NO BODY PARAGRAPH ON THIS STEP (requested). The heading already states
          the rule the step runs on — highest MVestimate, pre-selected against
          the plan cap — and the reassurance the paragraph carried is on screen
          three more times: the caption bar above ("All your leases stay on your
          record either way"), every archived card ("still counted"), and the
          guide box at the foot ("Archived = joined and counted…"). */}
      <StepIntro
        step={5}
        icon={Eye}
        eyebrow="Step 5 of 5 · Choose what you see"
        title={
          <>
            Visibility allocation ·{" "}
            <span className="underline decoration-mv-green decoration-2 underline-offset-4">
              highest-MVestimate
            </span>{" "}
            lease pre-selected against your plan cap
          </>
        }
      />

      <p className="rounded-[10px] border border-mv-sand-line bg-mv-sand-tint px-4 py-[13px] text-[12.5px] leading-[1.55] text-mv-sand">
        <b className="font-bold">
          Want all {claimTotals.count} from day one?
        </b>{" "}
        {premium.name} shows up to {premium.visibleLeases} visible leases (
        {planPrice(premium.monthly)}/mo or {planPrice(premium.yearly!)}/yr ·
        12-month term, never auto-renewed). {essentials.name} shows up to{" "}
        {essentials.visibleLeases} at {planPrice(essentials.monthly)}/mo.{" "}
        <PortalButtonLink
          href="/pricing"
          variant="ghost"
          size="sm"
          className="!inline !border-0 !bg-transparent !p-0 !text-[12.5px] !text-mv-green-deep underline underline-offset-2"
        >
          Upgrade to see all {claimTotals.count} →
        </PortalButtonLink>
      </p>

      <div className="grid gap-3 @[560px]:grid-cols-2">
        {leasesByValue.map((lease) => (
          <VisibilityCard
            key={lease.number}
            lease={lease}
            visible={lease.number === visibleLease.number}
            onChoose={
              lease.number === visibleLease.number
                ? undefined
                : () => onChoose(lease.number)
            }
          />
        ))}
      </div>

      <GuideNote title='What "archived" means'>
        Archived = joined and counted, value fields withheld at render.
        Membership, decimal interest and lease identity are retained; visibility
        is a per-lease flag reassignable from Settings without re-claiming.
      </GuideNote>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-mv-line pt-[18px]">
        <p className="text-[11.5px] text-mv-muted">
          Visible leases{" "}
          <b className="font-bold text-mv-ink">
            {freeVisibleLeases} of {claimTotals.count}
          </b>{" "}
          found — {visibleLease.name}
        </p>
        <PortalButton variant="primary" onClick={onFinish}>
          Finish — keep this lease visible →
        </PortalButton>
        <PortalButtonLink href="/pricing" variant="ghost" size="sm">
          Compare plans
        </PortalButtonLink>
        <PortalButtonLink href="/pricing" variant="ghost" size="sm">
          Upgrade to see all {claimTotals.count}
        </PortalButtonLink>
      </div>
    </div>
  );
}
