"use client";

import Link from "next/link";

import type { LeaseAgg } from "@/lib/claim-search/types";

import { fmt } from "../_lib/working-set";
import { btnPrimary } from "./ui";

/**
 * The lease-report drawer. Owner count and appraised total are REAL — summed
 * from the county roll rows in the current result set — which is why the
 * drawer takes the aggregated `LeaseAgg` rather than re-deriving anything.
 * Production, wells and operators arrive in the full (account) Lease Report,
 * hence the CTA.
 */
export function LeaseDrawer({
  lease,
  onClose,
}: {
  lease: LeaseAgg | null;
  onClose: () => void;
}) {
  return (
    <>
      {lease && (
        <div
          className="fixed inset-0 z-[110] bg-[rgba(11,53,39,.5)] backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <aside
        role="dialog"
        aria-label="Lease report"
        aria-hidden={!lease}
        className={`fixed right-0 top-0 z-[111] flex h-full w-[min(500px,94vw)] flex-col bg-white shadow-[-18px_0_50px_rgba(11,53,39,.3)] transition-transform duration-200 ease-out ${lease ? "translate-x-0" : "translate-x-[103%]"}`}
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
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lease && (
            <>
              <div className="mt-[6px] flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-mv-mint px-[10px] py-[3px] text-[11.5px] font-extrabold text-mv-green-ink">
                  {lease.cnt} owner{lease.cnt === 1 ? "" : "s"} in your result set
                </span>
                <span className="inline-flex items-center rounded-full bg-[#e8ecf3] px-[10px] py-[3px] text-[11.5px] font-semibold text-mv-slate">
                  {fmt(lease.val)} appraised
                </span>
                <span className="inline-flex items-center rounded-full bg-[#e8ecf3] px-[10px] py-[3px] text-[11.5px] font-semibold text-mv-slate">
                  {lease.c} County
                </span>
              </div>
              <p className="mt-[10px] text-[11px] text-mv-muted">
                Owner count and appraised total are real, from the county roll
                rows in your current results. Production, wells, and operators
                arrive in the full Lease Report.
              </p>
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
