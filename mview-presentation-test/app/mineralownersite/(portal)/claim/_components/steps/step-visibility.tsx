"use client";

import { Eye } from "lucide-react";

import {
  PortalButton,
  PortalButtonLink,
} from "../../../../_components/ui/button";
import { byValueDesc, leaseKey, money, planPrice } from "../../_lib/claim-format";
import { claimPlans, freeVisibleLeases } from "../../_lib/claim-plans";
import type { FlowLease } from "../../_lib/claim-types";
import { FlowEmpty } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";
import { VisibilityCard } from "./visibility-card";

const [essentials, premium] = claimPlans;

/**
 * STEP 5 — visibility allocation over the leases the claim took.
 *
 * ── THIS IS A PAYWALL, AND THE ONE THING IT MUST NOT IMPLY ──
 *
 * That an unseen lease is a lost lease. Every archived card says "still
 * counted", the guide box states what archiving retains, and the caption bar
 * promises the whole set stays on the record either way. An owner who reads
 * this screen as "pay or forfeit the rest" has been told something false about
 * their own minerals, which is a worse outcome than a missed upgrade.
 *
 * ── THE PRE-SELECTION IS A RULE, AND IT IS REVERSIBLE ──
 *
 * Highest appraised value first, computed from the rows themselves. Every
 * archived card offers "Show this one instead": a default that cannot be
 * changed is an allocation; one that can is a starting point.
 *
 * ── THE PLAN CAPS ARE THE ONE THING HERE NO ENDPOINT SERVES ──
 *
 * None of the six owners endpoints carries entitlements or pricing, so the caps
 * and prices come from `claim-plans.ts`. They are product configuration rather
 * than record data — but they are stated numbers, and when a billing endpoint
 * exists this is the block to point at it.
 */
export function StepVisibility({
  leases,
  visibleKey,
  onChoose,
  onFinish,
}: {
  leases: FlowLease[];
  visibleKey: string | null;
  onChoose: (key: string) => void;
  onFinish: () => void;
}) {
  const ordered = byValueDesc(leases);
  const visible =
    ordered.find((lease) => leaseKey(lease) === visibleKey) ?? ordered[0] ?? null;

  return (
    <div className="grid gap-[18px]">
      <StepIntro
        step={5}
        icon={Eye}
        eyebrow="Step 5 of 5 · Choose what you see"
        title={
          <>
            Visibility allocation ·{" "}
            <span className="underline decoration-mv-green decoration-2 underline-offset-4">
              highest-value
            </span>{" "}
            lease pre-selected against your plan cap
          </>
        }
      />

      {leases.length === 0 ? (
        <FlowEmpty message="There are no leases to allocate yet." />
      ) : (
        <>
          <p className="rounded-[10px] border border-mv-sand-line bg-mv-sand-tint px-4 py-[13px] text-[12.5px] leading-[1.55] text-mv-sand">
            <b className="font-bold">
              Want all {leases.length} from day one?
            </b>{" "}
            {premium.name} shows up to {premium.visibleLeases} visible leases (
            {planPrice(premium.monthly)}/mo or {planPrice(premium.yearly!)}/yr ·
            12-month term, never auto-renewed). {essentials.name} shows up to{" "}
            {essentials.visibleLeases} at {planPrice(essentials.monthly)}/mo.
          </p>

          <div className="grid gap-3 @[560px]:grid-cols-2">
            {ordered.map((lease) => {
              const key = leaseKey(lease);
              const isVisible = visible !== null && key === leaseKey(visible);
              return (
                <VisibilityCard
                  key={key}
                  lease={lease}
                  visible={isVisible}
                  onChoose={isVisible ? undefined : () => onChoose(key)}
                />
              );
            })}
          </div>
        </>
      )}

      <GuideNote title='What "archived" means'>
        Archived = joined and counted, value fields withheld at render.
        Membership, decimal interest and lease identity are retained; visibility
        is a per-lease flag reassignable from Settings without re-claiming.
      </GuideNote>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-mv-line pt-[18px]">
        {visible && (
          <p className="text-[11.5px] text-mv-muted">
            Visible leases{" "}
            <b className="font-bold text-mv-ink">
              {Math.min(freeVisibleLeases, leases.length)} of {leases.length}
            </b>{" "}
            — {visible.name} · {money(visible.value)}
          </p>
        )}
        <PortalButton variant="primary" onClick={onFinish}>
          Finish — keep this lease visible →
        </PortalButton>
        <PortalButtonLink href="/pricing" variant="ghost" size="sm">
          Compare plans
        </PortalButtonLink>
      </div>
    </div>
  );
}
