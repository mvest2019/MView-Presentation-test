"use client";

import Link from "next/link";

import type { LeaseAgg } from "@/lib/claim-search/types";

import { fmt } from "../_lib/working-set";
import { btnPrimary, LockedInline } from "./ui";

/** One labelled figure in the drawer's readout. */
function Figure({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-mv-line bg-white px-3 py-[10px]">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[.05em] text-mv-sublabel">
        {label}
      </dt>
      <dd className="mt-[3px] text-[14px] font-bold text-mv-ink">{value}</dd>
    </div>
  );
}

/**
 * The lease-report drawer. Owner count and appraised total are REAL — summed
 * from the county roll rows in the current result set — which is why the
 * drawer takes the aggregated `LeaseAgg` rather than re-deriving anything.
 * Production, wells and operators arrive in the full (account) Lease Report,
 * hence the CTA.
 */
export function LeaseDrawer({
  lease,
  signedIn,
  onClose,
}: {
  lease: LeaseAgg | null;
  /** Signed-out visitors see the appraised chip as locked. */
  signedIn: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {lease && (
        <div
          className="fixed inset-0 z-[110] bg-mv-ink/50 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <aside
        role="dialog"
        aria-label="Lease report"
        aria-hidden={!lease}
        className={`fixed right-0 top-0 z-[111] flex h-full w-[min(500px,94vw)] flex-col bg-white shadow-mv-lg transition-transform duration-200 ease-out ${lease ? "translate-x-0" : "translate-x-[103%]"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-mv-line px-5 pb-[14px] pt-[18px]">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[.1em] text-mv-green-deep">
              Lease report
            </div>
            <h3 className="mt-[2px] text-[19px] font-bold">
              {lease && `${lease.n} · ${lease.c}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 flex-none cursor-pointer rounded-lg border border-mv-line text-[17px] leading-none text-mv-slate hover:bg-mv-bg"
          >
            ×
          </button>
        </div>
        {/* THE BODY IS FILLED, NOT STRETCHED (2026-09-11). Three chips and a
            caption inside a full-height drawer left most of a 500px column
            blank, which read as content that had failed to load. The figures
            are now a two-column readout, and what the full report adds is
            listed rather than only alluded to in the footer button. */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lease && (
            <>
              <dl className="grid grid-cols-2 gap-[10px]">
                <Figure
                  label="Owners in your results"
                  value={String(lease.cnt)}
                />
                <Figure
                  label="Appraised in your results"
                  value={
                    signedIn ? (
                      lease.partial ? `${fmt(lease.val)}+` : fmt(lease.val)
                    ) : (
                      <LockedInline label="Free account" />
                    )
                  }
                />
                <Figure label="County" value={`${lease.c} County`} />
                <Figure
                  label="Roll entries"
                  value={`${lease.rolls} row${lease.rolls === 1 ? "" : "s"}`}
                />
              </dl>
              <p className="mt-3 text-[11.5px] leading-[1.55] text-mv-muted">
                Owner count and appraised total are real, summed from the
                county roll rows in your <em>current results</em> — not the
                lease&rsquo;s totals across every owner.
                {lease.partial &&
                  " Some owners here carry no per-lease figure on the roll, so the total is a floor."}
              </p>

              <div className="mt-4 rounded-xl border border-mv-line bg-mv-bg px-4 py-[14px]">
                <h4 className="text-[12.5px] font-bold text-mv-ink">
                  The full Lease Report adds
                </h4>
                <ul className="mt-2 space-y-[7px] text-[12.5px] text-mv-slate">
                  {[
                    "Wells on the lease, with permit and completion dates",
                    "Monthly oil and gas production, and the decline curve",
                    "Current operator and the operator history",
                    "Every owner on the lease, not just those in your results",
                  ].map((line) => (
                    <li key={line} className="flex gap-[8px]">
                      <span
                        aria-hidden="true"
                        className="mt-[6px] h-[5px] w-[5px] flex-none rounded-full bg-mv-green-deep"
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
        <div className="border-t border-mv-line px-5 py-[14px]">
          <Link
            href="/register?from=claim"
            onClick={onClose}
            className={`${btnPrimary} w-full`}
          >
            See the full Lease Report in your account &rarr;
          </Link>
        </div>
      </aside>
    </>
  );
}
