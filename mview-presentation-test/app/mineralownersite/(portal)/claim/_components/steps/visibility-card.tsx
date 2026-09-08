"use client";

import { Check } from "lucide-react";

import { Badge } from "../../../../_components/ui/badge";
import { decimalInterest, money } from "../../_lib/claim-format";
import type { FlowLease } from "../../_lib/claim-types";

/**
 * ONE LEASE ON STEP 5 — either visible in full, or archived behind the cap.
 *
 * ── WHY THE ARCHIVED VALUE IS BLURRED RATHER THAN ABSENT ──
 *
 * A missing figure reads as "we don't have this". A blurred one reads as "this
 * exists and you are not being shown it", which is the truth — the value came
 * back from the roll with every other lease on the record.
 *
 * `aria-hidden` on the blurred figure with an `sr-only` explanation beside it:
 * a screen reader cannot see a blur, and reading out the exact number this
 * design is withholding would defeat the withholding entirely.
 */
export function VisibilityCard({
  lease,
  visible,
  onChoose,
}: {
  lease: FlowLease;
  visible: boolean;
  /** Absent on the lease already occupying the free slot. */
  onChoose?: () => void;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-mv border p-[14px] ${
        visible ? "border-mv-green bg-mv-mint/40" : "border-mv-line bg-mv-card"
      }`}
    >
      {visible && (
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 flex h-[24px] w-[28px] items-center justify-center rounded-bl-[10px] bg-mv-green-deep text-white"
        >
          <Check className="h-[13px] w-[13px]" strokeWidth={3} />
        </span>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-6">
        <h3 className="text-[12.5px] font-bold text-mv-ink">
          {lease.name}
          {lease.number ? ` (${lease.number})` : ""}
        </h3>
        <Badge tone={lease.producing ? "mint" : "slate"} size="xs">
          {lease.producing ? "Valued" : "No value"}
        </Badge>
      </div>

      <p className="mt-[5px] text-[11px] text-mv-muted">
        {lease.operator ?? "No operator on file"} · {lease.county} Co. · DI{" "}
        {decimalInterest(lease.decimal)}
      </p>

      {visible ? (
        <>
          <p className="mt-[10px] text-[17px] font-extrabold text-mv-ink">
            {money(lease.value)}{" "}
            <span className="text-[11px] font-semibold text-mv-muted">
              appraised
            </span>
          </p>
          <p className="mt-[8px] text-[11.5px] font-semibold text-mv-green-deep">
            Your visible free lease ✓
          </p>
        </>
      ) : (
        <>
          <p className="mt-[10px]">
            <span
              aria-hidden="true"
              className="inline-block rounded bg-mv-portal-wash px-2 py-[3px] text-[17px] font-extrabold text-mv-slate/50 blur-[5px] select-none"
            >
              {money(lease.value)}
            </span>
            <span className="sr-only">
              Value withheld — this lease is archived until you upgrade.
            </span>
          </p>
          <p className="mt-[8px] text-[11.5px] font-semibold text-mv-amber">
            Found — archived until you upgrade — still counted
          </p>
          {onChoose && (
            <button
              type="button"
              onClick={onChoose}
              className="mt-[8px] cursor-pointer text-[11.5px] font-semibold text-mv-green-deep underline underline-offset-2"
            >
              Show this one instead →
            </button>
          )}
        </>
      )}
    </article>
  );
}
